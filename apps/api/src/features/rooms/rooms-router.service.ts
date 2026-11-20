import { AppConfig } from '@api/core/config/app-config.service';
import { CLIENT_IP_HEADER } from '@api/core/rate-limit/rate-limit.constant';
import { RateLimiter } from '@api/core/rate-limit/rate-limit.service';
import { problemResponse } from '@api/features/room/problem-response.util';
import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Match from 'effect/Match';
import * as Option from 'effect/Option';
import { RoomsNamespace } from './rooms-namespace.service';

/** Requests per window one client may open on the ws route. */
export const WS_RATE_LIMIT = 3;
/** Suffix separating ws counters from other limits keyed by the same address. */
const WS_COUNTER_SUFFIX = 'rooms-ws';
/** Header telling a client when to retry. */
const RETRY_AFTER_HEADER = 'Retry-After';

/** Binding to the Durable Object namespace that holds rooms. */
type Rooms = Context.Service.Shape<typeof RoomsNamespace>;
/** Token consumer the ws gate calls. */
type Limiter = Context.Service.Shape<typeof RateLimiter>;
/** App configuration carrying the rate-limit window. */
type Config = Context.Service.Shape<typeof AppConfig>;

/**
 * Forwards a handshake to the room named by its key.
 * @param rooms Namespace holding the room.
 * @param request Handshake request.
 * @param roomKey Room code naming the Durable Object.
 * @returns The room's response.
 */
const forwardToRoom = (rooms: Rooms, request: Request, roomKey: string): Effect.Effect<Response> =>
  Effect.promise(() => rooms.namespace.get(rooms.namespace.idFromName(roomKey)).fetch(request));

/**
 * Copies a problem response with a Retry-After header.
 * @param response Problem response to copy.
 * @param retryAfterMs Delay before retry, in milliseconds.
 * @returns The copied response carrying the delay in whole seconds.
 */
const withRetryAfter = (response: Response, retryAfterMs: number): Response => {
  const headers = new Headers(response.headers);
  headers.set(RETRY_AFTER_HEADER, String(Math.ceil(retryAfterMs / 1000)));
  return new Response(response.body, { status: response.status, headers });
};

/**
 * Gates one handshake by the client's ws budget.
 * @param limiter Token consumer.
 * @param config App configuration carrying the window.
 * @param rooms Namespace holding the room.
 * @param request Handshake request.
 * @param roomKey Room code naming the Durable Object.
 * @param clientIp Client address the counter is keyed by.
 * @returns The room's response, or a 429/503 problem.
 */
const forwardLimited = (
  limiter: Limiter,
  config: Config,
  rooms: Rooms,
  request: Request,
  roomKey: string,
  clientIp: string,
): Effect.Effect<Response> =>
  limiter.consume(`${clientIp}:${WS_COUNTER_SUFFIX}`, WS_RATE_LIMIT, config.rateLimit.window).pipe(
    Effect.matchEffect({
      onFailure: () => Effect.succeed(problemResponse(503, 'Service Unavailable')),
      onSuccess: (result) =>
        Match.value(result.allowed).pipe(
          Match.when(true, () => forwardToRoom(rooms, request, roomKey)),
          Match.orElse(() =>
            Effect.succeed(
              withRetryAfter(problemResponse(429, 'Too Many Requests'), result.resetAfterMs),
            ),
          ),
        ),
    }),
  );

/**
 * Forwards a handshake, applying the ws rate limit when the client is known.
 * @param limiter Token consumer.
 * @param config App configuration carrying the window.
 * @param rooms Namespace holding the room.
 * @param request Handshake request.
 * @param roomKey Room code naming the Durable Object.
 * @returns The room's response, or a rate-limit problem.
 */
const forward = (
  limiter: Limiter,
  config: Config,
  rooms: Rooms,
  request: Request,
  roomKey: string,
): Effect.Effect<Response> =>
  Option.match(Option.fromNullishOr(request.headers.get(CLIENT_IP_HEADER)), {
    onNone: () => forwardToRoom(rooms, request, roomKey),
    onSome: (clientIp) => forwardLimited(limiter, config, rooms, request, roomKey, clientIp),
  });

/** Routes a room handshake request, gating the ws upgrade by rate limit. */
export class RoomsRouter extends Context.Service<
  RoomsRouter,
  {
    /** Forwards a handshake to its room after the ws gate. */
    forward: (request: Request, roomKey: string) => Effect.Effect<Response>;
  }
>()('RoomsRouter', {
  make: Effect.map(
    Effect.all({ rooms: RoomsNamespace, limiter: RateLimiter, config: AppConfig }),
    ({ rooms, limiter, config }) => ({
      forward: (request, roomKey) => forward(limiter, config, rooms, request, roomKey),
    }),
  ),
}) {
  /** Layer providing the router from the room namespace, limiter, and config. */
  static readonly layer = Layer.effect(RoomsRouter, RoomsRouter.make);
}
