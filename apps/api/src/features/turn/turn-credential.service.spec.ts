import { AppConfig } from '@api/core/config/app-config.service';
import * as ConfigProvider from 'effect/ConfigProvider';
import * as Effect from 'effect/Effect';
import { FetchHttpClient } from 'effect/http';
import * as Layer from 'effect/Layer';
import { describe, expect, it } from 'vitest';
import { TurnCredential } from './turn-credential.service';

/** One request as the fake fetch saw it. */
interface RecordedRequest {
  /** Resolved request URL. */
  readonly url: string;
  /** Request method. */
  readonly method: string;
  /** Bearer header, when one was set. */
  readonly authorization: string | null;
  /** Decoded request body. */
  readonly body: string;
}

/** In-memory fetch plus the requests it received. */
interface FakeFetch {
  /** Fetch implementation to provide to the client. */
  readonly fetch: typeof globalThis.fetch;
  /** Requests seen, in arrival order. */
  readonly requests: RecordedRequest[];
}

/**
 * Builds a fake fetch that records each request and answers with one response.
 * @param respond Builds the response for a recorded request.
 * @returns The fake fetch and the requests it saw.
 */
const fakeFetch = (respond: (request: RecordedRequest) => Response): FakeFetch => {
  const requests: RecordedRequest[] = [];
  const fetchImpl = (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const headers = new Headers(init?.headers);
    const request: RecordedRequest = {
      url: String(input),
      method: init?.method ?? 'GET',
      authorization: headers.get('authorization'),
      body: init?.body instanceof Uint8Array ? new TextDecoder().decode(init.body) : '',
    };
    requests.push(request);
    return Promise.resolve(respond(request));
  };
  return { fetch: fetchImpl, requests };
};

/**
 * Builds a JSON response the way Cloudflare would.
 * @param body Body to serialize.
 * @param status Response status.
 * @returns The response.
 */
const jsonResponse = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });

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

/** Valid environment for the credential service. */
const anEnv = {
  APP_VERSION: '1.2.3',
  TURN_KEY_ID: 'key-1',
  TURN_KEY_API_TOKEN: 'api-token-1',
  TURN_CREDENTIAL_TTL: '3600',
};

/**
 * Runs an effect against the real credential service over a fake fetch.
 * @param effect Effect to run, requiring the credential service.
 * @param fake Fake fetch backing the HTTP client.
 * @param env Environment the app reads through Config.
 * @returns The effect's result.
 */
const runTurn = <A, E>(
  effect: Effect.Effect<A, E, TurnCredential>,
  fake: FakeFetch,
  env: Record<string, string> = anEnv,
): Promise<A> =>
  Effect.runPromise(
    effect.pipe(
      Effect.provide(
        TurnCredential.layer.pipe(
          Layer.provide(AppConfig.layer),
          Layer.provide(FetchHttpClient.layer),
          Layer.provide(Layer.succeed(FetchHttpClient.Fetch, fake.fetch)),
        ),
      ),
      Effect.provide(ConfigProvider.layer(ConfigProvider.fromUnknown(env))),
    ),
  );

/**
 * Mints credentials, flipping a failure into the success channel.
 * @param fake Fake fetch backing the HTTP client.
 * @param env Environment the app reads through Config.
 * @returns The minting error.
 */
const mintError = (fake: FakeFetch, env: Record<string, string> = anEnv) =>
  runTurn(
    Effect.flatMap(TurnCredential, (credential) => Effect.flip(credential.mint())),
    fake,
    env,
  );

describe('TurnCredential', () => {
  describe('success', () => {
    it('posts the configured key, token, and ttl and decodes the response', async () => {
      const fake = fakeFetch(() => jsonResponse(aCloudflareBody));

      const servers = await runTurn(
        Effect.flatMap(TurnCredential, (credential) => credential.mint()),
        fake,
      );

      expect(fake.requests).toEqual([
        {
          url: 'https://rtc.live.cloudflare.com/v1/turn/keys/key-1/credentials/generate-ice-servers',
          method: 'POST',
          authorization: 'Bearer api-token-1',
          body: JSON.stringify({ ttl: 3600 }),
        },
      ]);
      expect(servers).toEqual(aCloudflareBody.iceServers);
    });

    it('defaults the ttl to one day when it is not configured', async () => {
      const fake = fakeFetch(() => jsonResponse(aCloudflareBody));

      await runTurn(
        Effect.flatMap(TurnCredential, (credential) => credential.mint()),
        fake,
        { APP_VERSION: '1.2.3', TURN_KEY_ID: 'key-1', TURN_KEY_API_TOKEN: 'api-token-1' },
      );

      expect(fake.requests[0]?.body).toBe(JSON.stringify({ ttl: 86400 }));
    });

    it('clamps the ttl to the 48 hour maximum', async () => {
      const fake = fakeFetch(() => jsonResponse(aCloudflareBody));

      await runTurn(
        Effect.flatMap(TurnCredential, (credential) => credential.mint()),
        fake,
        { ...anEnv, TURN_CREDENTIAL_TTL: '259200' },
      );

      expect(fake.requests[0]?.body).toBe(JSON.stringify({ ttl: 172800 }));
    });

    it('leaves username and credential off servers that omit them', async () => {
      const fake = fakeFetch(() => jsonResponse(aCloudflareBody));

      const servers = await runTurn(
        Effect.flatMap(TurnCredential, (credential) => credential.mint()),
        fake,
      );

      expect(servers[0]).toEqual({ urls: ['stun:stun.cloudflare.com:3478'] });
    });
  });

  describe('invariants', () => {
    it('fails with TurnCredentialError when Cloudflare answers an error status', async () => {
      const fake = fakeFetch(() => jsonResponse({}, 500));

      const error = await mintError(fake);

      expect(error._tag).toBe('TurnCredentialError');
    });

    it('fails with TurnCredentialError when the response body does not decode', async () => {
      const fake = fakeFetch(() => jsonResponse({ iceServers: [{ urls: 'not-an-array' }] }));

      const error = await mintError(fake);

      expect(error._tag).toBe('TurnCredentialError');
    });

    it('fails with TurnCredentialError when the transport rejects', async () => {
      const fake: FakeFetch = {
        fetch: () => Promise.reject(new Error('network down')),
        requests: [],
      };

      const error = await mintError(fake);

      expect(error._tag).toBe('TurnCredentialError');
    });
  });
});
