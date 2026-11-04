import { env } from 'cloudflare:workers';
import { AppLayer } from '@api/core/http/app.layer';
import { Room } from '@api/features/room/room';
import { roomKeyFromPath } from '@api/features/rooms/room-key.util';
import { RoomsNamespace } from '@api/features/rooms/rooms-namespace.service';
import * as ConfigProvider from 'effect/ConfigProvider';
import { HttpRouter } from 'effect/http';
import * as Layer from 'effect/Layer';

export { Room };

/** The app served as a fetch handler, with Worker env vars as its configuration. */
const app = HttpRouter.toWebHandler(
  AppLayer.pipe(
    Layer.provide(Layer.succeed(RoomsNamespace, { namespace: env.ROOMS })),
    Layer.provide(ConfigProvider.layer(ConfigProvider.fromUnknown(env))),
  ),
  { disableLogger: true },
);

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
    return env.ROOMS.get(env.ROOMS.idFromName(roomKey)).fetch(request);
  },
} satisfies ExportedHandler<Env>;
