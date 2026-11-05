import { Injectable } from '@angular/core';
import { PROTOCOL_VERSION } from '@contract/signal/protocol-version.constant';
import {
  admit,
  initialRoomState,
  type Occupancy,
  type Outbound,
  reduce,
  type Step,
} from '@contract/signal/room.reducer';
import type { RoomCreated } from '@contract/signal/room-created.model';
import { type RoomId, randomRoomId } from '@contract/signal/room-id.model';
import { randomSid, type Sid } from '@contract/signal/sid.model';
import * as Match from 'effect/Match';
import { Subject } from 'rxjs';
import { SignalTransport } from '../../shared/interfaces/signal-transport';
import type { SignalMessage } from '../../shared/utils/signal-message.util';
import { parseSignalMessage } from '../../shared/utils/signal-message.util';
import type { HostPhase, IdlePhase, Phase } from '../types/transport-phase.type';

/** Initial phase before any room is created or joined. */
const IDLE: IdlePhase = { _tag: 'idle' };

/** Occupancy of a room with both parties connected. */
const FULL: Occupancy = { initiator: true, responder: true };

/** Occupancy of a room in each host phase, with the host as initiator. */
const OCCUPANCY = {
  'host-waiting': { initiator: true, responder: false },
  'host-joined': { initiator: true, responder: true },
} satisfies Record<HostPhase['_tag'], Occupancy>;

/**
 * Derives the room occupancy from the host phase.
 * @param phase Host phase.
 * @returns Roles currently connected.
 */
const occupancyOf = (phase: HostPhase): Occupancy => OCCUPANCY[phase._tag];

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
    const sid = randomSid();
    this.phase = { _tag: 'host-waiting', sid };
    const roomId = randomRoomId();
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
   * Sends a message on the open channel.
   * @param message Message to send.
   */
  override send(message: SignalMessage): void {
    this.post(message);
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
      Match.when({ type: 'joined' }, (joined) => this.resolveJoin(joined.sid)),
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
      Match.whenOr({ _tag: 'host-waiting' }, { _tag: 'host-joined' }, (phase) =>
        this.answerJoin(phase, message),
      ),
      Match.orElse(() => undefined),
    );
  }

  /**
   * Admits or turns away the guest through the shared reducer.
   * @param phase Host phase answering the request.
   * @param message Join request.
   */
  private answerJoin(phase: HostPhase, message: Extract<SignalMessage, { type: 'join' }>): void {
    Match.value(admit('responder', occupancyOf(phase), phase.sid, null)).pipe(
      Match.tag('reject', () => this.post({ type: 'error', code: 'room-full' })),
      Match.tag('admit', () =>
        this.applyStep(
          phase,
          reduce(
            initialRoomState,
            FULL,
            { _tag: 'message', role: 'responder', message },
            phase.sid,
          ),
        ),
      ),
      Match.exhaustive,
    );
  }

  /**
   * Applies a reducer step and dispatches its outbound messages.
   * @param phase Host phase that produced the step.
   * @param step The reducer step.
   */
  private applyStep(phase: HostPhase, step: Step): void {
    Match.value(step).pipe(
      Match.tag('advance', (next) => {
        this.phase = { _tag: 'host-joined', sid: phase.sid };
        next.outbound.forEach((outbound) => {
          this.dispatch(outbound);
        });
      }),
      Match.tag('kill', (next) => {
        next.outbound.forEach((outbound) => {
          this.dispatch(outbound);
        });
        this.close();
      }),
      Match.exhaustive,
    );
  }

  /**
   * Routes an outbound message to the party it addresses.
   * @param outbound Message and its recipient.
   */
  private dispatch(outbound: Outbound): void {
    Match.value(outbound.to).pipe(
      Match.when('initiator', () => this.messages.next(outbound.message)),
      Match.when('responder', () => this.post(outbound.message)),
      Match.exhaustive,
    );
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
}
