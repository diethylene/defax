import { DurableObject } from 'cloudflare:workers';
import { decodeInbound } from '@contract/signal/message.model';
import { decodeSid } from '@contract/signal/sid.model';
import * as Match from 'effect/Match';
import * as Option from 'effect/Option';
import * as Result from 'effect/Result';
import { positiveNumber } from '../../shared/utils/positive-number.util';
import type { Role } from './role.model';
import {
  admit,
  initialRoomState,
  type Occupancy,
  type Outbound,
  type RoomEvent,
  type RoomState,
  reduce,
  type Step,
} from './room.reducer';

/** Room lifetime in milliseconds when the environment does not set one. */
export const DEFAULT_TTL_MS = 300_000;

/** Bindings a room reads from its environment. */
export interface RoomEnv {
  /** Lifetime of the room in milliseconds, as a string or number. */
  readonly ROOM_TTL_MS?: string | number;
}

/** A signaling room held by one Durable Object. */
export class Room extends DurableObject<RoomEnv> {
  /** Lifetime of the room in milliseconds. */
  private readonly ttlMs: number;

  /**
   * Binds the room to its Durable Object state and environment.
   * @param ctx Durable Object state.
   * @param env Room environment bindings.
   */
  constructor(ctx: DurableObjectState, env: RoomEnv) {
    super(ctx, env);
    this.ttlMs = positiveNumber(env.ROOM_TTL_MS, DEFAULT_TTL_MS);
  }

  /**
   * Routes an init or upgrade request, answering 404 for anything else.
   * @param request Incoming request.
   * @returns The response.
   */
  override async fetch(request: Request): Promise<Response> {
    const segments = new URL(request.url).pathname.split('/').filter(Boolean);
    const action = segments.at(-1);
    return Match.value([action, request.method] as const).pipe(
      Match.when(['init', 'POST'], () => this.init(request)),
      Match.when(['ws', 'GET'], () => this.upgrade(request)),
      Match.orElse(() => new Response('not found', { status: 404 })),
    );
  }

  /**
   * Handles a frame from a peer, killing the room when it is unreadable.
   * @param ws Socket that sent the frame.
   * @param data Frame text or bytes.
   */
  override async webSocketMessage(ws: WebSocket, data: string | ArrayBuffer): Promise<void> {
    const role = this.roleFor(ws);
    if (role === null) return this.killNow();
    const text = typeof data === 'string' ? data : new TextDecoder().decode(data);
    return Result.match(decodeInbound(text), {
      onSuccess: (message) => this.dispatch({ _tag: 'message', role, message }),
      onFailure: () => this.killNow(),
    });
  }

  /**
   * Handles a peer closing its socket.
   * @param ws Socket that closed.
   */
  override async webSocketClose(ws: WebSocket): Promise<void> {
    const role = this.roleFor(ws);
    if (role === null) return this.killNow();
    await this.dispatch({ _tag: 'peer-disconnected', role });
  }

  /**
   * Handles a socket error as a close.
   * @param ws Socket that failed.
   */
  override async webSocketError(ws: WebSocket): Promise<void> {
    await this.webSocketClose(ws);
  }

  /** Handles the room's expiry alarm. */
  override async alarm(): Promise<void> {
    await this.dispatch({ _tag: 'expired' });
  }

  /**
   * Stores a fresh session id and arms the expiry alarm.
   * @param request Request carrying the session id as its body.
   * @returns The response.
   */
  private async init(request: Request): Promise<Response> {
    const sid = await request.text();
    if (!Option.isSome(decodeSid(sid))) {
      return new Response('invalid sid', { status: 400 });
    }
    await this.ctx.storage.put({ sid, state: initialRoomState });
    await this.ctx.storage.setAlarm(Date.now() + this.ttlMs);
    return new Response(null, { status: 204 });
  }

  /**
   * Admits a peer and hands back its socket.
   * @param request Upgrade request, whose sid query marks the initiator.
   * @returns The upgrade response.
   */
  private async upgrade(request: Request): Promise<Response> {
    const presentedSid = new URL(request.url).searchParams.get('sid');
    const role: Role = presentedSid === null ? 'responder' : 'initiator';
    const storedSid = await this.storedSid();
    if (storedSid === null) return new Response('not found', { status: 404 });

    const decision = admit(role, this.occupancy(), storedSid, presentedSid);
    if (decision._tag === 'reject') {
      return decision.status === 409
        ? new Response(JSON.stringify({ code: 'room-full' }), {
            status: 409,
            headers: { 'content-type': 'application/json' },
          })
        : new Response('forbidden', { status: 403 });
    }

    const pair = new WebSocketPair();
    this.ctx.acceptWebSocket(pair[1], [role]);
    const event: RoomEvent =
      role === 'initiator' ? { _tag: 'initiator-connected' } : { _tag: 'responder-connected' };
    await this.dispatch(event);
    return new Response(null, { status: 101, webSocket: pair[0] });
  }

  /**
   * Feeds one event through the reducer and applies the step.
   * @param event The event to apply.
   */
  private async dispatch(event: RoomEvent): Promise<void> {
    const state = await this.loadState();
    const storedSid = await this.storedSid();
    const sid = Option.flatMap(Option.fromNullishOr(storedSid), decodeSid);
    return Option.match(sid, {
      onNone: () => this.killNow(),
      onSome: (validSid) => this.apply(reduce(state, this.occupancy(), event, validSid)),
    });
  }

  /**
   * Sends the step's messages, then saves or erases the room.
   * @param step Step produced by the reducer.
   */
  private async apply(step: Step): Promise<void> {
    this.sendAll(step.outbound);
    if (step._tag === 'advance') {
      await this.ctx.storage.put('state', step.state);
      return;
    }
    this.closeAllSockets();
    await this.ctx.storage.deleteAlarm();
    await this.ctx.storage.deleteAll();
  }

  /** Erases the room without sending anything. */
  private async killNow(): Promise<void> {
    await this.apply({ _tag: 'kill', outbound: [] });
  }

  /**
   * Delivers messages to their recipients.
   * @param outbound Messages to send.
   */
  private sendAll(outbound: readonly Outbound[]): void {
    outbound.forEach(({ to, message }) => {
      const ws = this.socketFor(to);
      if (ws) ws.send(JSON.stringify(message));
    });
  }

  /** Closes every accepted socket. */
  private closeAllSockets(): void {
    this.ctx.getWebSockets().forEach((ws) => {
      ws.close(1000, 'room closed');
    });
  }

  /**
   * Finds the socket held by one role.
   * @param role Role to look up.
   * @returns The socket, or null when the role is not connected.
   */
  private socketFor(role: Role): WebSocket | null {
    return this.ctx.getWebSockets(role)[0] ?? null;
  }

  /**
   * Reports which roles currently hold a connection.
   * @returns The room's occupancy.
   */
  private occupancy(): Occupancy {
    return {
      initiator: this.ctx.getWebSockets('initiator').length > 0,
      responder: this.ctx.getWebSockets('responder').length > 0,
    };
  }

  /**
   * Reads the role tagged on a socket.
   * @param ws Socket to inspect.
   * @returns The socket's role, or null when it carries none.
   */
  private roleFor(ws: WebSocket): Role | null {
    const tags = this.ctx.getTags(ws);
    if (tags.includes('initiator')) return 'initiator';
    if (tags.includes('responder')) return 'responder';
    return null;
  }

  /**
   * Reads the stored room state.
   * @returns The stored state, or the initial state when none is saved.
   */
  private async loadState(): Promise<RoomState> {
    const state = await this.ctx.storage.get<RoomState>('state');
    return state ?? initialRoomState;
  }

  /**
   * Reads the session id issued at init.
   * @returns The stored session id, or null when the room was never initialized.
   */
  private async storedSid(): Promise<string | null> {
    return (await this.ctx.storage.get<string>('sid')) ?? null;
  }
}
