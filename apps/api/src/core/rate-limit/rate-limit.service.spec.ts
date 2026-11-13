import * as Duration from 'effect/Duration';
import * as Effect from 'effect/Effect';
import { describe, expect, it } from 'vitest';
import type { ConsumeResult } from './rate-limit.model';
import { RateLimiter, RateLimiterUnavailable } from './rate-limit.service';
import { FakeRateLimiterNamespace } from './rate-limit-namespace.fake';
import { RateLimiterNamespace } from './rate-limit-namespace.service';

/** Consumes one token for the default test key. */
const consume = Effect.flatMap(RateLimiter, (limiter) =>
  limiter.consume('a', 2, Duration.minutes(1)),
);

/**
 * Runs a limiter program over a fake namespace.
 * @param namespace Namespace standing in for the RATE_LIMITER binding.
 * @param program Program requiring the limiter.
 * @returns The program's success value.
 */
const run = <A, E>(
  namespace: FakeRateLimiterNamespace,
  program: Effect.Effect<A, E, RateLimiter>,
): Promise<A> =>
  program.pipe(
    Effect.provide(RateLimiter.layer),
    Effect.provideService(RateLimiterNamespace, { namespace }),
    Effect.runPromise,
  );

describe('RateLimiter', () => {
  describe('success', () => {
    it('returns the Durable Object consume result', async () => {
      const result = await run(new FakeRateLimiterNamespace(), consume);

      expect(result).toEqual<ConsumeResult>({
        allowed: true,
        remaining: 1,
        resetAfterMs: 60_000,
      });
    });
  });

  describe('invariants', () => {
    it('fails with RateLimiterUnavailable when the store errors', async () => {
      const error = await run(FakeRateLimiterNamespace.failing(), consume.pipe(Effect.flip));

      expect(error).toBeInstanceOf(RateLimiterUnavailable);
      expect(error._tag).toBe('RateLimiterUnavailable');
    });
  });
});
