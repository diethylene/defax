import { AppLayer } from '@api/core/http/app.layer';
import { FakeRateLimiterNamespace } from '@api/core/rate-limit/rate-limit-namespace.fake';
import { RateLimiterNamespace } from '@api/core/rate-limit/rate-limit-namespace.service';
import { FakeRoomsNamespace } from '@api/features/rooms/rooms-namespace.fake';
import { RoomsNamespace } from '@api/features/rooms/rooms-namespace.service';
import { apiEnvelopeOf } from '@contract/http/api-envelope.model';
import { ProblemDetails } from '@contract/http/problem-details.model';
import { IceServersResponse } from '@contract/turn/ice-servers.model';
import * as ConfigProvider from 'effect/ConfigProvider';
import { FetchHttpClient, HttpRouter } from 'effect/http';
import * as Layer from 'effect/Layer';
import * as Schema from 'effect/Schema';
import { describe, expect, it, onTestFinished } from 'vitest';

/** Schema of the successful credentials response. */
const CredentialsEnvelope = apiEnvelopeOf(IceServersResponse);

/** A valid Cloudflare generate-ice-servers body. */
const aCloudflareBody = {
  iceServers: [
    { urls: ['stun:stun.cloudflare.com:3478'] },
    {
      urls: ['turn:turn.cloudflare.com:3478?transport=udp'],
      username: 'user-1',
      credential: 'credential-1',
    },
  ],
};

/** Valid environment for the endpoint. */
const anEnv = {
  APP_VERSION: '1.2.3',
  TURN_KEY_ID: 'key-1',
  TURN_KEY_API_TOKEN: 'api-token-1',
  TURN_CREDENTIAL_TTL: '3600',
};

/**
 * Builds a fetch that always answers the same Cloudflare response.
 * @param body Body to return.
 * @param status Status to return.
 * @returns The fetch implementation.
 */
const fetchReturning =
  (body: unknown, status = 200): typeof globalThis.fetch =>
  () =>
    Promise.resolve(
      new Response(JSON.stringify(body), {
        status,
        headers: { 'content-type': 'application/json' },
      }),
    );

/**
 * Builds the app's fetch handler with the given env vars and upstream fetch.
 * @param env Environment variables the app reads through Config.
 * @param fetchImpl Fetch the HTTP client uses for Cloudflare.
 * @returns A function from Request to Response.
 */
const handlerWith = (
  env: Record<string, string>,
  fetchImpl: typeof globalThis.fetch,
): ((request: Request) => Promise<Response>) => {
  const { handler, dispose } = HttpRouter.toWebHandler(
    AppLayer.pipe(
      Layer.provide(Layer.succeed(FetchHttpClient.Fetch, fetchImpl)),
      Layer.provide(Layer.succeed(RoomsNamespace, { namespace: new FakeRoomsNamespace() })),
      Layer.provide(
        Layer.succeed(RateLimiterNamespace, { namespace: new FakeRateLimiterNamespace() }),
      ),
      Layer.provide(ConfigProvider.layer(ConfigProvider.fromUnknown(env))),
    ),
    { disableLogger: true },
  );
  onTestFinished(dispose);
  return (request) => handler(request);
};

describe('POST /turn/credentials', () => {
  describe('success', () => {
    it('returns 201 with the enveloped ice servers', async () => {
      const handle = handlerWith(anEnv, fetchReturning(aCloudflareBody));

      const response = await handle(
        new Request('http://local/turn/credentials', { method: 'POST' }),
      );
      const body: unknown = await response.json();
      const envelope = Schema.decodeUnknownSync(CredentialsEnvelope)(body);

      expect(response.status).toBe(201);
      expect(envelope.status).toBe('success');
      expect(envelope.data.iceServers).toEqual(aCloudflareBody.iceServers);
      expect(response.headers.get('access-control-allow-origin')).toBe('*');
    });
  });

  describe('invariants', () => {
    it('returns 502 problem+json when minting fails', async () => {
      const handle = handlerWith(anEnv, fetchReturning({}, 500));

      const response = await handle(
        new Request('http://local/turn/credentials', { method: 'POST' }),
      );
      const body: unknown = await response.json();
      const problem = Schema.decodeUnknownSync(ProblemDetails)(body);

      expect(response.status).toBe(502);
      expect(response.headers.get('content-type')).toContain('application/problem+json');
      expect(problem.type).toBe('about:blank');
      expect(problem.status).toBe(502);
      expect(problem.requestId).toBe(response.headers.get('x-request-id'));
      expect(problem).not.toHaveProperty('detail');
    });
  });
});
