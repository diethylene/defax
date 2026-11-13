import * as Schema from 'effect/Schema';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ConsumeResultSchema } from './rate-limit.model';
import { RateLimiterDo } from './rate-limiter.do';
import { FakeRateLimitState } from './rate-limiter.do.harness';

/** URL the limiter consumes through. */
const consumeUrl = 'https://rate-limiter/consume';

/** Fixed instant the fake clock starts at. */
const start = new Date('2026-01-01T00:00:00.000Z');

/**
 * Builds a limiter over in-memory state.
 * @returns The fake state and the limiter under test.
 */
const setup = () => {
  const state = new FakeRateLimitState();
  const limiter = new RateLimiterDo(state as unknown as DurableObjectState, {});
  return { state, limiter };
};

/**
 * Sends one consume request and decodes the result.
 * @param limiter Limiter under test.
 * @param input Consume input.
 * @returns The decoded consume result.
 */
const consume = async (
  limiter: RateLimiterDo,
  input: { readonly key: string; readonly limit: number; readonly windowMs: number },
) => {
  const response = await limiter.fetch(
    new Request(consumeUrl, { method: 'POST', body: JSON.stringify(input) }),
  );
  expect(response.status).toBe(200);
  return Schema.decodeUnknownSync(ConsumeResultSchema)(await response.json());
};

describe('RateLimiterDo', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(start);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('success', () => {
    it('counts each request up to the limit within one window', async () => {
      const { limiter } = setup();

      expect(await consume(limiter, { key: 'a', limit: 3, windowMs: 60_000 })).toEqual({
        allowed: true,
        remaining: 2,
        resetAfterMs: 60_000,
      });
      expect(await consume(limiter, { key: 'a', limit: 3, windowMs: 60_000 })).toEqual({
        allowed: true,
        remaining: 1,
        resetAfterMs: 60_000,
      });
      expect(await consume(limiter, { key: 'a', limit: 3, windowMs: 60_000 })).toEqual({
        allowed: true,
        remaining: 0,
        resetAfterMs: 60_000,
      });
    });

    it('tracks keys independently', async () => {
      const { limiter } = setup();

      await consume(limiter, { key: 'a', limit: 2, windowMs: 60_000 });
      expect(await consume(limiter, { key: 'b', limit: 2, windowMs: 60_000 })).toEqual({
        allowed: true,
        remaining: 1,
        resetAfterMs: 60_000,
      });
    });
  });

  describe('invariants', () => {
    it('flags a request beyond the limit', async () => {
      const { limiter } = setup();

      await consume(limiter, { key: 'a', limit: 2, windowMs: 60_000 });
      await consume(limiter, { key: 'a', limit: 2, windowMs: 60_000 });

      expect(await consume(limiter, { key: 'a', limit: 2, windowMs: 60_000 })).toEqual({
        allowed: false,
        remaining: 0,
        resetAfterMs: 60_000,
      });
    });

    it('resets the counter once the window passes', async () => {
      const { limiter } = setup();

      await consume(limiter, { key: 'a', limit: 2, windowMs: 60_000 });
      await consume(limiter, { key: 'a', limit: 2, windowMs: 60_000 });
      vi.setSystemTime(new Date(start.getTime() + 60_000));

      expect(await consume(limiter, { key: 'a', limit: 2, windowMs: 60_000 })).toEqual({
        allowed: true,
        remaining: 1,
        resetAfterMs: 60_000,
      });
    });

    it('rejects a body that does not match the schema', async () => {
      const { limiter } = setup();

      const response = await limiter.fetch(
        new Request(consumeUrl, { method: 'POST', body: JSON.stringify({ key: 'a' }) }),
      );

      expect(response.status).toBe(400);
    });
  });
});
