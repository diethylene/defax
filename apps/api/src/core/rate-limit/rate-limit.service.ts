import {
  ConsumeRequestSchema,
  type ConsumeResult,
  ConsumeResultSchema,
} from '@api/core/rate-limit/rate-limit.model';
import { RateLimiterNamespace } from '@api/core/rate-limit/rate-limit-namespace.service';
import * as Context from 'effect/Context';
import * as Data from 'effect/Data';
import * as Duration from 'effect/Duration';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Match from 'effect/Match';
import * as Option from 'effect/Option';
import * as Schema from 'effect/Schema';

/** URL the limiter Durable Object consumes through. */
const CONSUME_URL = 'https://rate-limiter/consume';
/** Most a consume call may take before the limiter reports itself unavailable. */
const CONSUME_TIMEOUT = '5 seconds';

/** Limiter's backing store is unreachable. */
export class RateLimiterUnavailable extends Data.TaggedError('RateLimiterUnavailable')<{
  /** Underlying failure. */
  readonly cause: unknown;
}> {}

/**
 * Decodes a consume response into its result.
 * @param response Response returned by the limiter's Durable Object.
 * @returns The decoded result, or a failure when the response is unusable.
 */
const decodeResult = (response: Response): Effect.Effect<ConsumeResult, RateLimiterUnavailable> =>
  Match.value(response.ok).pipe(
    Match.when(true, () =>
      Effect.tryPromise({
        try: () => response.json(),
        catch: (cause) => new RateLimiterUnavailable({ cause }),
      }).pipe(
        Effect.flatMap((body: unknown) =>
          Option.match(Schema.decodeUnknownOption(ConsumeResultSchema)(body), {
            onNone: () => Effect.fail(new RateLimiterUnavailable({ cause: body })),
            onSome: (result) => Effect.succeed(result),
          }),
        ),
      ),
    ),
    Match.orElse(() => Effect.fail(new RateLimiterUnavailable({ cause: response.status }))),
  );

/** Consumes fixed-window tokens for a key. */
export class RateLimiter extends Context.Service<
  RateLimiter,
  {
    /** Consumes one token, reporting whether the request may proceed. */
    consume: (
      key: string,
      limit: number,
      window: Duration.Duration,
    ) => Effect.Effect<ConsumeResult, RateLimiterUnavailable>;
  }
>()('RateLimiter', {
  make: Effect.map(RateLimiterNamespace, ({ namespace }) => {
    const stub = namespace.get(namespace.idFromName('default'));
    return {
      consume: (key, limit, window) =>
        Effect.tryPromise({
          try: () =>
            stub.fetch(CONSUME_URL, {
              method: 'POST',
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify(
                Schema.encodeSync(ConsumeRequestSchema)({
                  key,
                  limit,
                  windowMs: Duration.toMillis(window),
                }),
              ),
            }),
          catch: (cause) => new RateLimiterUnavailable({ cause }),
        }).pipe(
          Effect.timeout(CONSUME_TIMEOUT),
          Effect.catchTag('TimeoutError', (cause) =>
            Effect.fail(new RateLimiterUnavailable({ cause })),
          ),
          Effect.flatMap(decodeResult),
        ),
    };
  }),
}) {
  /** Layer providing the limiter from the RATE_LIMITER namespace. */
  static readonly layer = Layer.effect(RateLimiter, RateLimiter.make);
}
