import { AppConfig } from '@api/core/config/app-config.service';
import { problemDetails, REQUEST_ID_HEADER } from '@api/core/http/problem-details.util';
import { CLIENT_IP_HEADER } from '@api/core/rate-limit/rate-limit.constant';
import { RateLimit } from '@api/core/rate-limit/rate-limit.model';
import { RateLimiter } from '@api/core/rate-limit/rate-limit.service';
import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import { HttpServerRequest, HttpServerResponse } from 'effect/http';
import { HttpApiMiddleware } from 'effect/http-api';
import * as Layer from 'effect/Layer';
import * as Match from 'effect/Match';
import * as Option from 'effect/Option';

/** App configuration the middleware reads. */
type Config = Context.Service.Shape<typeof AppConfig>;
/** Token consumer the middleware calls. */
type Limiter = Context.Service.Shape<typeof RateLimiter>;

/** Header telling a client when to retry. */
const RETRY_AFTER_HEADER = 'Retry-After';

/**
 * Builds a problem+json response.
 * @param status HTTP status code.
 * @param retryAfterMs Delay before retry, in milliseconds, when one applies.
 * @returns The problem response, tagged with a fresh request id.
 */
const problemResponse = (
  status: number,
  retryAfterMs?: number,
): HttpServerResponse.HttpServerResponse => {
  const requestId = crypto.randomUUID();
  const base = HttpServerResponse.jsonUnsafe(
    problemDetails(status, requestId, new Date().toISOString()),
    { status, contentType: 'application/problem+json' },
  ).pipe(HttpServerResponse.setHeader(REQUEST_ID_HEADER, requestId));
  return Option.match(Option.fromNullishOr(retryAfterMs), {
    onNone: () => base,
    onSome: (millis) =>
      base.pipe(HttpServerResponse.setHeader(RETRY_AFTER_HEADER, String(Math.ceil(millis / 1000)))),
  });
};

/**
 * Builds the middleware implementation used by the API.
 * @param config App configuration carrying the default limit and window.
 * @param limiter Token consumer backed by the rate limiter Durable Object.
 * @returns The middleware that rate-limits every endpoint.
 */
const middlewareFor =
  (
    config: Config,
    limiter: Limiter,
  ): HttpApiMiddleware.HttpApiMiddleware<never, never, AppConfig | RateLimiter> =>
  (httpEffect, { endpoint }) =>
    Effect.gen(function* () {
      const request = yield* HttpServerRequest.HttpServerRequest;
      const clientKey = request.headers[CLIENT_IP_HEADER];
      if (clientKey === undefined) return yield* httpEffect;
      const limit = Option.getOrElse(
        Context.getOption(endpoint.annotations, RateLimit),
        () => config.rateLimit.limit,
      );
      const outcome = yield* limiter
        .consume(`${clientKey}:${endpoint.identifier}`, limit, config.rateLimit.window)
        .pipe(
          Effect.map(Option.some),
          Effect.catchTag('RateLimiterUnavailable', () => Effect.succeed(Option.none())),
        );
      return yield* Option.match(outcome, {
        onNone: () => Effect.succeed(problemResponse(503)),
        onSome: (result) =>
          Match.value(result.allowed).pipe(
            Match.when(true, () => httpEffect),
            Match.orElse(() => Effect.succeed(problemResponse(429, result.resetAfterMs))),
          ),
      });
    });

/** Rate-limits every API endpoint by client address and endpoint. */
export class RateLimitMiddleware extends HttpApiMiddleware.Service<
  RateLimitMiddleware,
  { requires: AppConfig | RateLimiter }
>()('RateLimitMiddleware') {
  /** Layer providing the middleware from the app config and limiter. */
  static readonly layer = Layer.effect(
    RateLimitMiddleware,
    Effect.map(Effect.all({ config: AppConfig, limiter: RateLimiter }), ({ config, limiter }) =>
      middlewareFor(config, limiter),
    ),
  );
}
