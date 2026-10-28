import { Injectable } from '@angular/core';
import { PROTOCOL_VERSION } from '@contract/signal/protocol-version.constant';
import { decodeSid as decodeWireSid } from '@contract/signal/sid.model';
import * as Match from 'effect/Match';
import * as Option from 'effect/Option';
import { Subject } from 'rxjs';
import type { RoomCreated, RoomId, Sid } from '../../shared/interfaces/signal-session';
import { SignalTransport } from '../../shared/interfaces/signal-transport';
import { createSid, decodeSid, encodeSid } from '../../shared/utilities/sid';
import type { SignalMessage } from '../../shared/utilities/signal-message';
import { parseSignalMessage } from '../../shared/utilities/signal-message';

/** Transport phase with no room open. */
interface IdlePhase {
  /** Discriminant. */
  readonly _tag: 'idle';
}

/** Host waiting for a guest to join. */
interface HostWaitingPhase {
  /** Discriminant. */
  readonly _tag: 'host-waiting';
  /** Session id the host will hand to the guest. */
  readonly sid: Sid;
  /** Messages held until the guest joins. */
  readonly outgoing: readonly SignalMessage[];
}

/** Host with a guest connected. */
interface HostJoinedPhase {
  /** Discriminant. */
  readonly _tag: 'host-joined';
  /** Session id handed to the guest. */
  readonly sid: Sid;
}

/** Callbacks awaiting a join answer. */
interface PendingJoin {
  /** Resolves with the host session id. */
  readonly resolve: (sid: Sid) => void;
  /** Rejects with the join failure. */
  readonly reject: (error: Error) => void;
}

/** Guest waiting for the host to answer its join request. */
interface GuestConnectingPhase {
  /** Discriminant. */
  readonly _tag: 'guest-connecting';
  /** Callbacks for the pending join. */
  readonly pending: PendingJoin;
}

/** Guest whose join attempt has settled. */
interface GuestSettledPhase {
  /** Discriminant. */
  readonly _tag: 'guest-settled';
}

/** Host phases that answer join requests. */
type HostPhase = HostWaitingPhase | HostJoinedPhase;

/** Lifecycle phase of the transport. */
type Phase =
  | IdlePhase
  | HostWaitingPhase
  | HostJoinedPhase
  | GuestConnectingPhase
  | GuestSettledPhase;

/** Initial phase before any room is created or joined. */
const IDLE: IdlePhase = { _tag: 'idle' };

/** In-browser transport exchanging messages over a BroadcastChannel. */
@Injectable()
export class BroadcastChannelTransport extends SignalTransport {
  /** Outbound message stream. */
  private readonly messages = new Subject<SignalMessage>();
  /** Observable view of the outbound message stream. */
  override readonly messages$ = this.messages.asObservable();

  /** Open channel resource, or null before opening and after close. */
  private channel: BroadcastChannel | null = null;
  /** Current lifecycle phase. */
  private phase: Phase = IDLE;

  /** Parses inbound channel data and forwards valid messages. */
  private readonly onMessage = (event: MessageEvent): void => {
    const message = parseSignalMessage(event.data);
    if (!message) return;
    this.handleInbound(message);
    this.messages.next(message);
  };

  /**
   * Creates a room and becomes its host.
   * @returns The generated room id and the host session id.
   */
  override createRoom(): RoomCreated {
    this.close();
    const sid = createSid();
    this.phase = { _tag: 'host-waiting', sid, outgoing: [] };
    const roomId = this.generateRoomId();
    this.openChannel(roomId);
    return { roomId, sid };
  }

  /**
   * Joins an existing room as a guest.
   * @param roomId Room to join.
   * @returns Promise resolving with the host session id.
   */
  override joinRoom(roomId: RoomId): Promise<Sid> {
    this.close();
    this.openChannel(roomId);
    return new Promise<Sid>((resolve, reject) => {
      this.phase = { _tag: 'guest-connecting', pending: { resolve, reject } };
      this.post({ type: 'join', protocol: PROTOCOL_VERSION });
    });
  }

  /**
   * Sends a message, queueing it while the host has no guest.
   * @param message Message to send.
   */
  override send(message: SignalMessage): void {
    Match.value(this.phase).pipe(
      Match.when({ _tag: 'host-waiting' }, (phase) => {
        this.phase = { ...phase, outgoing: [...phase.outgoing, message] };
      }),
      Match.orElse(() => this.post(message)),
    );
  }

  /** Closes the channel, rejects a pending join, and resets to idle. */
  override close(): void {
    if (this.channel) {
      this.channel.removeEventListener('message', this.onMessage);
      this.channel.close();
      this.channel = null;
    }
    Match.value(this.phase).pipe(
      Match.when({ _tag: 'guest-connecting' }, (phase) =>
        phase.pending.reject(new Error('Transport closed')),
      ),
      Match.orElse(() => undefined),
    );
    this.phase = IDLE;
  }

  /**
   * Opens the channel for a room.
   * @param roomId Room to open the channel for.
   */
  private openChannel(roomId: RoomId): void {
    this.channel = new BroadcastChannel(`room-${roomId}`);
    this.channel.addEventListener('message', this.onMessage);
  }

  /**
   * Routes an inbound message to the handlers for the current phase.
   * @param message Decoded inbound message.
   */
  private handleInbound(message: SignalMessage): void {
    Match.value(message).pipe(
      Match.when({ type: 'join' }, (join) => this.handleJoin(join)),
      Match.when({ type: 'joined' }, (joined) => this.resolveJoin(decodeSid(joined.sid))),
      Match.when({ type: 'error' }, (error) => this.rejectJoin(new Error(error.code))),
      Match.orElse(() => undefined),
    );
  }

  /**
   * Answers a join request while hosting.
   * @param message Join request.
   */
  private handleJoin(message: Extract<SignalMessage, { type: 'join' }>): void {
    Match.value(this.phase).pipe(
      Match.when({ _tag: 'host-waiting' }, (phase) => this.answerJoin(phase, message)),
      Match.when({ _tag: 'host-joined' }, (phase) => this.answerJoin(phase, message)),
      Match.orElse(() => undefined),
    );
  }

  /**
   * Validates the protocol and admits or turns away the guest.
   * @param phase Host phase answering the request.
   * @param message Join request.
   */
  private answerJoin(phase: HostPhase, message: Extract<SignalMessage, { type: 'join' }>): void {
    if (message.protocol !== PROTOCOL_VERSION) {
      this.post({ type: 'error', code: 'protocol-mismatch' });
      return;
    }
    Match.value(phase).pipe(
      Match.when({ _tag: 'host-waiting' }, (waiting) => this.acceptJoin(waiting)),
      Match.when({ _tag: 'host-joined' }, () => this.post({ type: 'error', code: 'room-full' })),
      Match.exhaustive,
    );
  }

  /**
   * Admits a waiting guest and flushes the queued messages.
   * @param phase Host phase waiting for a guest.
   */
  private acceptJoin(phase: HostWaitingPhase): void {
    this.phase = { _tag: 'host-joined', sid: phase.sid };
    this.messages.next({ type: 'peer-joined' });
    phase.outgoing.forEach((message) => this.post(message));
    this.post({
      type: 'joined',
      sid: Option.getOrThrow(decodeWireSid(encodeSid(phase.sid))),
    });
  }

  /**
   * Settles a pending guest join with the host session id.
   * @param sid Host session id.
   */
  private resolveJoin(sid: Sid): void {
    Match.value(this.phase).pipe(
      Match.when({ _tag: 'guest-connecting' }, (phase) => {
        phase.pending.resolve(sid);
        this.phase = { _tag: 'guest-settled' };
      }),
      Match.orElse(() => undefined),
    );
  }

  /**
   * Settles a pending guest join with a failure.
   * @param error Join failure.
   */
  private rejectJoin(error: Error): void {
    Match.value(this.phase).pipe(
      Match.when({ _tag: 'guest-connecting' }, (phase) => {
        phase.pending.reject(error);
        this.phase = { _tag: 'guest-settled' };
      }),
      Match.orElse(() => undefined),
    );
  }

  /**
   * Posts a message on the open channel, when one exists.
   * @param message Message to post.
   */
  private post(message: SignalMessage): void {
    this.channel?.postMessage(message);
  }

  /**
   * Generates a six-digit room id.
   * @returns Room id in the 100000 to 999999 range.
   */
  private generateRoomId(): RoomId {
    const words = crypto.getRandomValues(new Uint32Array(1));
    // biome-ignore lint/style/noNonNullAssertion: a one-word Uint32Array always yields index 0.
    const value = words[0]! % 900000;
    return String(value + 100000);
  }
}
