import { AppConfig } from '@api/core/config/app-config.service';
import { RateLimiter } from '@api/core/rate-limit/rate-limit.service';
import { RoomsNamespace } from './rooms-namespace.service';
import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

/** Requests per window one client may open on the ws route. */
export const WS_RATE_LIMIT = 3;

/** Routes a room handshake request, gating the ws upgrade by rate limit. */
export class RoomsRouter extends Context.Service<
  RoomsRouter,
  {
    forward: (request: Request, roomKey: string) => Effect.Effect<Response>;
  }
>()('RoomsRouter', {
  make: Effect.map(
    Effect.all({ rooms: RoomsNamespace, limiter: RateLimiter, config: AppConfig }),
    () => ({
      forward: (_request, _roomKey) =>
        Effect.die(new Error('RoomsRouter.forward is not implemented')),
    }),
  ),
}) {
  static readonly layer = Layer.effect(RoomsRouter, RoomsRouter.make);
}
