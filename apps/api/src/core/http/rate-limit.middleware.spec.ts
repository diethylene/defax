import { AppLayer } from '@api/core/http/app.layer';
import { FakeRateLimiterNamespace } from '@api/core/rate-limit/rate-limit-namespace.fake';
import { RateLimiterNamespace } from '@api/core/rate-limit/rate-limit-namespace.service';
import { FakeRoomsNamespace } from '@api/features/rooms/rooms-namespace.fake';
import { RoomsNamespace } from '@api/features/rooms/rooms-namespace.service';
import { Health } from '@contract/health/health.model';
import { apiEnvelopeOf } from '@contract/http/api-envelope.model';
import { ProblemDetails } from '@contract/http/problem-details.model';
import { RoomCreated } from '@contract/signal/room-created.model';
import * as ConfigProvider from 'effect/ConfigProvider';
import { HttpRouter } from 'effect/http';
import * as Layer from 'effect/Layer';
import * as Schema from 'effect/Schema';
import { describe, expect, it, onTestFinished } from 'vitest';

/** Schema of the successful health response. */
const HealthEnvelope = apiEnvelopeOf(Health);
/** Schema of the successful create response. */
const CreatedEnvelope = apiEnvelopeOf(RoomCreated);

/** Environment the app reads through Config in these tests. */
const env = {
  APP_VERSION: '1.2.3',
  RATE_LIMIT_DEFAULT: '1',
  RATE_LIMIT_WINDOW: '1 minute',
};

/**
 * Builds the app's fetch handler with fake namespaces.
 * @param limiter Namespace standing in for the RATE_LIMITER binding.
 * @returns A function from Request to Response.
 */
const handlerWith = (
  limiter: FakeRateLimiterNamespace,
): ((request: Request) => Promise<Response>) => {
  const { handler, dispose } = HttpRouter.toWebHandler(
    AppLayer.pipe(
      Layer.provide(Layer.succeed(RoomsNamespace, { namespace: new FakeRoomsNamespace() })),
      Layer.provide(Layer.succeed(RateLimiterNamespace, { namespace: limiter })),
      Layer.provide(ConfigProvider.layer(ConfigProvider.fromUnknown(env))),
    ),
    { disableLogger: true },
  );
  onTestFinished(dispose);
  return (request) => handler(request);
};

/**
 * Builds a request with an optional client address header.
 * @param path Path to request.
 * @param clientIp Address to present, or null to omit the header.
 * @param method HTTP method.
 * @returns The request.
 */
const request = (path: string, clientIp: string | null, method = 'GET'): Request =>
  new Request(`http://local${path}`, {
    method,
    headers: clientIp === null ? {} : { 'cf-connecting-ip': clientIp },
  });

/**
 * Reads a failure response as problem+json.
 * @param response Failure response.
 * @returns The decoded problem details.
 */
const problemOf = async (response: Response) =>
  Schema.decodeUnknownSync(ProblemDetails)(await response.json());

describe('RateLimitMiddleware', () => {
  describe('success', () => {
    it('passes a request under the limit through the envelope untouched', async () => {
      const handle = handlerWith(new FakeRateLimiterNamespace());

      const response = await handle(request('/api/health', '203.0.113.1'));
      const body: unknown = await response.json();
      const envelope = Schema.decodeUnknownSync(HealthEnvelope)(body);

      expect(response.status).toBe(200);
      expect(envelope.status).toBe('success');
      expect(envelope.data).toEqual({ status: 'ok', version: '1.2.3' });
      expect(envelope.meta.requestId).toBe(response.headers.get('x-request-id'));
    });
  });

  describe('invariants', () => {
    it('answers 429 problem+json with Retry-After once the endpoint override is spent', async () => {
      const handle = handlerWith(new FakeRateLimiterNamespace());
      const create = () => handle(request('/rooms/create', '203.0.113.2', 'POST'));

      const first = await create();
      const second = await create();
      const third = await create();
      const fourth = await create();
      const fifth = await create();
      const blocked = await create();
      const created = Schema.decodeUnknownSync(CreatedEnvelope)(await first.json());
      const problem = await problemOf(blocked);
      const retryAfter = Number(blocked.headers.get('retry-after'));

      expect([first.status, second.status, third.status, fourth.status, fifth.status]).toEqual([
        201, 201, 201, 201, 201,
      ]);
      expect(created.status).toBe('success');
      expect(blocked.status).toBe(429);
      expect(blocked.headers.get('content-type')).toContain('application/problem+json');
      expect(problem.type).toBe('about:blank');
      expect(problem.title).toBe('Too Many Requests');
      expect(problem.status).toBe(429);
      expect(problem.requestId).toBe(blocked.headers.get('x-request-id'));
      expect(retryAfter).toBeGreaterThan(0);
      expect(retryAfter).toBeLessThanOrEqual(60);
    });

    it('applies the default limit when the endpoint has no override', async () => {
      const handle = handlerWith(new FakeRateLimiterNamespace());

      const first = await handle(request('/api/health', '203.0.113.3'));
      const second = await handle(request('/api/health', '203.0.113.3'));
      const problem = await problemOf(second);

      expect(first.status).toBe(200);
      expect(second.status).toBe(429);
      expect(problem.title).toBe('Too Many Requests');
    });

    it('passes a request without a client address through', async () => {
      const handle = handlerWith(new FakeRateLimiterNamespace());

      const first = await handle(request('/api/health', null));
      const second = await handle(request('/api/health', null));

      expect(first.status).toBe(200);
      expect(second.status).toBe(200);
    });

    it('fails closed with 503 when the limiter is unavailable', async () => {
      const handle = handlerWith(FakeRateLimiterNamespace.failing());

      const response = await handle(request('/api/health', '203.0.113.4'));
      const problem = await problemOf(response);

      expect(response.status).toBe(503);
      expect(response.headers.get('content-type')).toContain('application/problem+json');
      expect(problem.title).toBe('Service Unavailable');
      expect(problem.status).toBe(503);
    });
  });
});
