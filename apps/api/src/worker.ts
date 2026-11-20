import { env } from 'cloudflare:workers';
import { AppConfig } from '@api/core/config/app-config.service';
import { AppLayer } from '@api/core/http/app.layer';
import { RateLimiter } from '@api/core/rate-limit/rate-limit.service';
import { RateLimiterNamespace } from '@api/core/rate-limit/rate-limit-namespace.service';
import { RateLimiterDo } from '@api/core/rate-limit/rate-limiter.do';
import { Room } from '@api/features/room/room';
import { roomKeyFromPath } from '@api/features/rooms/room-key.util';
import { RoomsNamespace } from '@api/features/rooms/rooms-namespace.service';
import { RoomsRouter } from '@api/features/rooms/rooms-router.service';
import * as ConfigProvider from 'effect/ConfigProvider';
import * as Effect from 'effect/Effect';
import { HttpRouter } from 'effect/http';
import * as Layer from 'effect/Layer';
import * as ManagedRuntime from 'effect/ManagedRuntime';

export { RateLimiterDo, Room };

/** Environment variables as the config provider both runtimes read. */
const configProvider = ConfigProvider.layer(ConfigProvider.fromUnknown(env));

/** The app served as a fetch handler, with Worker env vars as its configuration. */
const app = HttpRouter.toWebHandler(
  AppLayer.pipe(
    Layer.provide(Layer.succeed(RoomsNamespace, { namespace: env.ROOMS })),
    Layer.provide(Layer.succeed(RateLimiterNamespace, { namespace: env.RATE_LIMITER })),
    Layer.provide(configProvider),
  ),
  { disableLogger: true },
);

/** Room handshake router, built once per isolate from the namespace bindings. */
const handshakes = ManagedRuntime.make(
  RoomsRouter.layer.pipe(
    Layer.provide(RateLimiter.layer),
    Layer.provide(AppConfig.layer),
    Layer.provide(Layer.succeed(RoomsNamespace, { namespace: env.ROOMS })),
    Layer.provide(Layer.succeed(RateLimiterNamespace, { namespace: env.RATE_LIMITER })),
    Layer.provide(configProvider),
  ),
);

/**
 * Rate-limits and forwards a room handshake.
 * @param request Incoming handshake request.
 * @param roomKey Room the request names.
 * @returns The room's response, or a rate-limit problem.
 */
const forwardHandshake = (request: Request, roomKey: string): Promise<Response> =>
  handshakes.runPromise(Effect.flatMap(RoomsRouter, ({ forward }) => forward(request, roomKey)));

/** Cloudflare Workers entry point. */
export default {
  /**
   * Routes room handshakes to their Durable Object and everything else to the API.
   * @param request Incoming request.
   * @returns The response.
   */
  fetch: (request: Request): Promise<Response> => {
    const roomKey = roomKeyFromPath(new URL(request.url).pathname);
    if (roomKey === null) return app.handler(request);
    return forwardHandshake(request, roomKey);
  },
} satisfies ExportedHandler<Env>;
