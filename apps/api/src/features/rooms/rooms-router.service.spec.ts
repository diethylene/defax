import { AppConfig } from '@api/core/config/app-config.service';
import { RateLimiter } from '@api/core/rate-limit/rate-limit.service';
import { FakeRateLimiterNamespace } from '@api/core/rate-limit/rate-limit-namespace.fake';
import { RateLimiterNamespace } from '@api/core/rate-limit/rate-limit-namespace.service';
import { ProblemDetails } from '@contract/http/problem-details.model';
import * as ConfigProvider from 'effect/ConfigProvider';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Schema from 'effect/Schema';
import { describe, expect, it } from 'vitest';
import { FakeRoomsNamespace } from './rooms-namespace.fake';
import { RoomsNamespace } from './rooms-namespace.service';
import { RoomsRouter } from './rooms-router.service';

/** Environment the router reads through Config in these tests. */
const env = {
  APP_VERSION: '1.2.3',
  RATE_LIMIT_WINDOW: '1 minute',
};

/** Room code these tests forward. */
const roomKey = '123456';

/**
 * Builds a ws handshake request with an optional client address header.
 * @param clientIp Address to present, or null to omit the header.
 * @returns The request.
 */
const request = (clientIp: string | null): Request =>
  new Request(`http://local/rooms/${roomKey}/ws`, {
    headers: clientIp === null ? {} : { 'cf-connecting-ip': clientIp },
  });

/**
 * Forwards one ws handshake through the router.
 * @param clientIp Address to present, or null to omit the header.
 * @returns The router's response.
 */
const forward = (clientIp: string | null): Effect.Effect<Response, never, RoomsRouter> =>
  Effect.flatMap(RoomsRouter, (router) => router.forward(request(clientIp), roomKey));

/**
 * Runs a router program over fake namespaces and the test environment.
 * @param rooms Namespace standing in for the ROOMS binding.
 * @param limiter Namespace standing in for the RATE_LIMITER binding.
 * @param program Program requiring the router.
 * @returns The program's success value.
 */
const run = (
  rooms: FakeRoomsNamespace,
  limiter: FakeRateLimiterNamespace,
  program: Effect.Effect<Response, never, RoomsRouter>,
): Promise<Response> =>
  program.pipe(
    Effect.provide(
      RoomsRouter.layer.pipe(
        Layer.provide(RateLimiter.layer),
        Layer.provide(AppConfig.layer),
        Layer.provide(Layer.succeed(RoomsNamespace, { namespace: rooms })),
        Layer.provide(Layer.succeed(RateLimiterNamespace, { namespace: limiter })),
        Layer.provide(ConfigProvider.layer(ConfigProvider.fromUnknown(env))),
      ),
    ),
    Effect.runPromise,
  );

/**
 * Reads a failure response as problem+json.
 * @param response Failure response.
 * @returns The decoded problem details.
 */
const problemOf = async (response: Response) =>
  Schema.decodeUnknownSync(ProblemDetails)(await response.json());

describe('RoomsRouter', () => {
  describe('success', () => {
    it('forwards an allowed ws upgrade to the room Durable Object', async () => {
      const rooms = new FakeRoomsNamespace();

      const response = await run(rooms, new FakeRateLimiterNamespace(), forward('203.0.113.1'));

      expect(response.status).toBe(101);
      expect(rooms.upgrades).toEqual([{ name: roomKey, url: `http://local/rooms/${roomKey}/ws` }]);
    });

    it('passes a request without a client address through on every call', async () => {
      const rooms = new FakeRoomsNamespace();
      const limiter = new FakeRateLimiterNamespace();

      const first = await run(rooms, limiter, forward(null));
      const second = await run(rooms, limiter, forward(null));
      const third = await run(rooms, limiter, forward(null));
      const fourth = await run(rooms, limiter, forward(null));

      expect([first.status, second.status, third.status, fourth.status]).toEqual([
        101, 101, 101, 101,
      ]);
      expect(rooms.upgrades).toHaveLength(4);
    });
  });

  describe('invariants', () => {
    it('answers 429 problem+json with Retry-After once the ws limit of 3 is spent', async () => {
      const rooms = new FakeRoomsNamespace();
      const limiter = new FakeRateLimiterNamespace();

      const first = await run(rooms, limiter, forward('203.0.113.2'));
      const second = await run(rooms, limiter, forward('203.0.113.2'));
      const third = await run(rooms, limiter, forward('203.0.113.2'));
      const blocked = await run(rooms, limiter, forward('203.0.113.2'));
      const problem = await problemOf(blocked);
      const retryAfter = Number(blocked.headers.get('retry-after'));

      expect([first.status, second.status, third.status]).toEqual([101, 101, 101]);
      expect(blocked.status).toBe(429);
      expect(blocked.headers.get('content-type')).toContain('application/problem+json');
      expect(problem.type).toBe('about:blank');
      expect(problem.title).toBe('Too Many Requests');
      expect(problem.status).toBe(429);
      expect(problem.requestId).toBe(blocked.headers.get('x-request-id'));
      expect(retryAfter).toBeGreaterThan(0);
      expect(retryAfter).toBeLessThanOrEqual(60);
      expect(rooms.upgrades).toHaveLength(3);
    });

    it('fails closed with 503 problem+json when the limiter is unavailable', async () => {
      const response = await run(
        new FakeRoomsNamespace(),
        FakeRateLimiterNamespace.failing(),
        forward('203.0.113.4'),
      );
      const problem = await problemOf(response);

      expect(response.status).toBe(503);
      expect(response.headers.get('content-type')).toContain('application/problem+json');
      expect(problem.title).toBe('Service Unavailable');
      expect(problem.status).toBe(503);
      expect(problem.requestId).toBe(response.headers.get('x-request-id'));
    });
  });
});
