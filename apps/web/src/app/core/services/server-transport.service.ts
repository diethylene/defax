import { Injectable, inject } from '@angular/core';
import { PROTOCOL_VERSION } from '@contract/signal/protocol-version.constant';
import type { RoomCreated } from '@contract/signal/room-created.model';
import type { RoomId } from '@contract/signal/room-id.model';
import type { Sid } from '@contract/signal/sid.model';
import * as Match from 'effect/Match';
import * as Option from 'effect/Option';
import * as Result from 'effect/Result';
import * as Schema from 'effect/Schema';
import { map, Observable, Subject, switchMap, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { SignalTransport } from '../../shared/interfaces/signal-transport';
import { parseSignalMessage, type SignalMessage } from '../../shared/utils/signal-message.util';
import { websocketBaseFrom } from '../../shared/utils/websocket-base.util';
import { RoomsApiService } from '../api/rooms-api.service';
import type { IdlePhase, Phase } from '../types/transport-phase.type';
import type { TransportSocket } from './web-socket-constructor.token';
import { WEB_SOCKET_CONSTRUCTOR } from './web-socket-constructor.token';

/** Initial phase before any room is created or joined. */
const IDLE: IdlePhase = { _tag: 'idle' };

/** Ready state of an open socket. */
const SOCKET_OPEN = 1;

/**
 * Parses a socket frame's JSON text.
 * @param data Frame content as the socket delivered it.
 * @returns The JSON value, or null when the frame is not JSON text.
 */
const frameValue = (data: unknown): unknown =>
  Option.getOrNull(Schema.decodeUnknownOption(Schema.fromJsonString(Schema.Unknown))(data));

/** Callbacks waiting for a socket to open. */
interface PendingOpen {
  /** Settles the wait with success. */
  readonly resolve: () => void;
  /** Settles the wait with the opening failure. */
  readonly reject: (error: Error) => void;
}

/**
 * URL of the host socket in a room.
 * @param room Room the host created.
 * @returns Absolute WebSocket URL carrying the host session id.
 */
const initiatorUrl = (room: RoomCreated): string =>
  `${websocketBaseFrom(environment.apiBaseUrl)}/rooms/${room.roomId}/ws?sid=${room.sid}`;

/**
 * URL of the guest socket in a room.
 * @param roomId Room to join.
 * @returns Absolute WebSocket URL without a session id.
 */
const responderUrl = (roomId: RoomId): string =>
  `${websocketBaseFrom(environment.apiBaseUrl)}/rooms/${roomId}/ws`;

/** Relay transport forwarding signalling frames over a WebSocket. */
@Injectable()
export class ServerTransport extends SignalTransport {
  /** Room creation API. */
  private readonly roomsApi = inject(RoomsApiService);
  /** Constructor opening the relay socket, substituted in tests. */
  private readonly socketConstructor = inject(WEB_SOCKET_CONSTRUCTOR);
  /** Inbound message stream. */
  private readonly messages = new Subject<SignalMessage>();
  /** Observable view of the inbound message stream. */
  override readonly messages$ = this.messages.asObservable();
  /** Open socket, or null outside a room. */
  private socket: TransportSocket | null = null;
  /** Callbacks waiting for the current socket to open. */
  private pendingOpen: PendingOpen | null = null;
  /** Current lifecycle phase. */
  private phase: Phase = IDLE;

  /** Parses every inbound frame and forwards the valid ones. */
  private readonly onMessage = (event: MessageEvent): void => {
    const message = parseSignalMessage(frameValue(event.data));
    if (!message) return;
    this.handleInbound(message);
    this.messages.next(message);
  };

  /**
   * Creates a room through the relay and opens the host socket.
   * @returns Observable of the created room once the socket is open.
   */
  override createRoom(): Observable<RoomCreated> {
    this.close();
    return this.roomsApi.createRoom(environment.apiBaseUrl).pipe(
      switchMap((result) =>
        Result.match(result, {
          onSuccess: (room) => this.connectInitiator(room),
          onFailure: (failure) => throwError(() => failure),
        }),
      ),
    );
  }

  /**
   * Joins a room through the relay and becomes its guest.
   * @param roomId Room to join.
   * @returns Observable of the host session id.
   */
  override joinRoom(roomId: RoomId): Observable<Sid> {
    this.close();
    return this.openSocket(responderUrl(roomId)).pipe(
      switchMap(
        () =>
          new Observable<Sid>((subscriber) => {
            this.phase = {
              _tag: 'guest-connecting',
              pending: {
                resolve: (sid) => {
                  subscriber.next(sid);
                  subscriber.complete();
                },
                reject: (error) => subscriber.error(error),
              },
            };
            this.send({ type: 'join', protocol: PROTOCOL_VERSION });
          }),
      ),
    );
  }

  /**
   * Sends a signalling message to the relay while the socket is open.
   * @param message Message to send.
   */
  override send(message: SignalMessage): void {
    const socket = this.socket;
    if (socket?.readyState !== SOCKET_OPEN) return;
    socket.send(JSON.stringify(message));
  }

  /** Closes the socket, rejects a pending join, and resets to idle. */
  override close(): void {
    const socket = this.socket;
    this.socket = null;
    if (socket) this.discard(socket);
    this.failOpen(new Error('Transport closed'));
    this.rejectJoin(new Error('Transport closed'));
    this.phase = IDLE;
  }

  /**
   * Opens the host socket and records the host phase.
   * @param room Room the host created.
   * @returns Observable of the room once the socket is open.
   */
  private connectInitiator(room: RoomCreated): Observable<RoomCreated> {
    return this.openSocket(initiatorUrl(room)).pipe(
      map(() => {
        this.phase = { _tag: 'host-waiting', sid: room.sid };
        return room;
      }),
    );
  }

  /**
   * Opens a relay socket and waits for it to connect.
   * @param url Socket URL to open.
   * @returns Observable of the open socket.
   */
  private openSocket(url: string): Observable<TransportSocket> {
    return new Observable<TransportSocket>((subscriber) => {
      const socket = new this.socketConstructor(url);
      this.socket = socket;
      socket.onmessage = this.onMessage;
      socket.onerror = () => this.fail(new Error('relay socket failed'));
      socket.onclose = () => this.fail(new Error('relay socket closed'));
      this.pendingOpen = {
        resolve: () => {
          subscriber.next(socket);
          subscriber.complete();
        },
        reject: (error) => subscriber.error(error),
      };
      socket.onopen = () => this.resolveOpen();
    });
  }

  /** Settles the pending open with success. */
  private resolveOpen(): void {
    const pending = this.pendingOpen;
    this.pendingOpen = null;
    pending?.resolve();
  }

  /**
   * Settles the pending open with a failure.
   * @param error Opening failure.
   */
  private failOpen(error: Error): void {
    const pending = this.pendingOpen;
    this.pendingOpen = null;
    pending?.reject(error);
  }

  /**
   * Drops a broken socket and rejects whatever waits on it.
   * @param error Failure that ended the connection.
   */
  private fail(error: Error): void {
    this.socket = null;
    this.failOpen(error);
    this.rejectJoin(error);
    this.phase = IDLE;
  }

  /**
   * Detaches from a socket and closes it.
   * @param socket Socket to release.
   */
  private discard(socket: TransportSocket): void {
    socket.onopen = null;
    socket.onmessage = null;
    socket.onerror = null;
    socket.onclose = null;
    socket.close();
  }

  /**
   * Routes a joined or error frame to the pending join.
   * @param message Decoded inbound frame.
   */
  private handleInbound(message: SignalMessage): void {
    Match.value(message).pipe(
      Match.when({ type: 'joined' }, (joined) => this.resolveJoin(joined.sid)),
      Match.when({ type: 'error' }, (error) => this.rejectJoin(new Error(error.code))),
      Match.orElse(() => undefined),
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
}
