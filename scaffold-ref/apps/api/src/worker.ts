import { env } from 'cloudflare:workers';
import { AppLayer } from '@api/core/http/app.layer';
import * as ConfigProvider from 'effect/ConfigProvider';
import { HttpRouter } from 'effect/http';
import * as Layer from 'effect/Layer';

/** The app served as a fetch handler, with Worker env vars as its configuration. */
const app = HttpRouter.toWebHandler(
  AppLayer.pipe(Layer.provide(ConfigProvider.layer(ConfigProvider.fromUnknown(env)))),
  { disableLogger: true },
);

/** Cloudflare Workers entry point. */
export default {
  /**
   * Serves one request.
   * @param request Incoming request.
   * @returns The response.
   */
  fetch: (request: Request): Promise<Response> => app.handler(request),
} satisfies ExportedHandler<Env>;
