import { AppConfig } from '@api/core/config/app-config.service';
import type * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import { pipe } from 'effect/Function';
import { HttpServerRequest, HttpServerResponse } from 'effect/http';
import { HttpApiMiddleware } from 'effect/http-api';
import * as Layer from 'effect/Layer';
import * as Option from 'effect/Option';

/** App configuration the middleware reads. */
type Config = Context.Service.Shape<typeof AppConfig>;

/** Origin marker that allows every caller; safe only because the API sends no credentials. */
const WILDCARD = '*';

/** Header the browser sends with the calling origin. */
const ORIGIN_HEADER = 'origin';

/**
 * Chooses the allow-origin header value for a request.
 * @param allowedOrigins Configured allowlist; `*` allows every origin.
 * @param origin Origin the browser sent, if any.
 * @returns The value to echo, or none when the origin is not allowed.
 */
const allowOriginFor = (
  allowedOrigins: readonly string[],
  origin: string | undefined,
): Option.Option<string> => {
  if (allowedOrigins.includes(WILDCARD)) return Option.some(WILDCARD);
  return pipe(
    Option.fromNullishOr(origin),
    Option.filter((value) => allowedOrigins.includes(value)),
  );
};

/**
 * Builds the middleware implementation used by the API.
 * @param config App configuration carrying the origin allowlist.
 * @returns The middleware that tags responses with CORS headers.
 */
const middlewareFor =
  (config: Config): HttpApiMiddleware.HttpApiMiddleware<never, never, AppConfig> =>
  (httpEffect) =>
    Effect.gen(function* () {
      const request = yield* HttpServerRequest.HttpServerRequest;
      const response = yield* httpEffect;
      return Option.match(
        allowOriginFor(config.cors.allowedOrigins, request.headers[ORIGIN_HEADER]),
        {
          onNone: () => response,
          onSome: (allowed) =>
            response.pipe(
              HttpServerResponse.setHeader('access-control-allow-origin', allowed),
              HttpServerResponse.setHeader('vary', 'Origin'),
            ),
        },
      );
    });

/** Adds CORS headers so allowlisted browser origins can call the API. */
export class CorsMiddleware extends HttpApiMiddleware.Service<
  CorsMiddleware,
  { requires: AppConfig }
>()('CorsMiddleware') {
  /** Layer providing the middleware from the app's configuration. */
  static readonly layer = Layer.effect(
    CorsMiddleware,
    Effect.map(AppConfig, (config) => middlewareFor(config)),
  );
}
