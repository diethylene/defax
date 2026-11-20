import { AppLayer } from '@api/core/http/app.layer';
import { FakeRateLimiterNamespace } from '@api/core/rate-limit/rate-limit-namespace.fake';
import { RateLimiterNamespace } from '@api/core/rate-limit/rate-limit-namespace.service';
import { FakeRoomsNamespace } from '@api/features/rooms/rooms-namespace.fake';
import { RoomsNamespace } from '@api/features/rooms/rooms-namespace.service';
import * as ConfigProvider from 'effect/ConfigProvider';
import { HttpRouter } from 'effect/http';
import * as Layer from 'effect/Layer';
import { describe, expect, it, onTestFinished } from 'vitest';

/**
 * Builds the app's fetch handler with the given env vars.
 * @param env Environment variables the app reads through Config.
 * @returns A function from Request to Response.
 */
const handlerWith = (env: Record<string, string>): ((request: Request) => Promise<Response>) => {
  const { handler, dispose } = HttpRouter.toWebHandler(
    AppLayer.pipe(
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

/**
 * Builds a health request, optionally carrying a browser origin.
 * @param origin Origin to send, if any.
 * @returns The request.
 */
const healthRequest = (origin: string | undefined): Request =>
  new Request('http://local/api/health', origin === undefined ? {} : { headers: { origin } });

/** Environment with an explicit single-origin allowlist. */
const anAllowlistEnv = { APP_VERSION: '1.2.3', ALLOWED_ORIGIN: 'https://app.example' };

describe('CorsMiddleware', () => {
  describe('success', () => {
    it('echoes an allowlisted origin', async () => {
      const handle = handlerWith(anAllowlistEnv);

      const response = await handle(healthRequest('https://app.example'));

      expect(response.headers.get('access-control-allow-origin')).toBe('https://app.example');
      expect(response.headers.get('vary')).toBe('Origin');
    });
  });

  describe('invariants', () => {
    it('echoes the matching origin from a comma-separated allowlist', async () => {
      const handle = handlerWith({
        APP_VERSION: '1.2.3',
        ALLOWED_ORIGIN: 'https://app.example, https://staging.example',
      });

      const response = await handle(healthRequest('https://staging.example'));

      expect(response.headers.get('access-control-allow-origin')).toBe('https://staging.example');
    });

    it('omits the header when the origin is not allowlisted', async () => {
      const handle = handlerWith(anAllowlistEnv);

      const response = await handle(healthRequest('https://evil.example'));

      expect(response.headers.get('access-control-allow-origin')).toBeNull();
    });

    it('omits the header when the request has no origin', async () => {
      const handle = handlerWith(anAllowlistEnv);

      const response = await handle(healthRequest(undefined));

      expect(response.headers.get('access-control-allow-origin')).toBeNull();
    });

    it('falls back to the wildcard default when ALLOWED_ORIGIN is not configured', async () => {
      const handle = handlerWith({ APP_VERSION: '1.2.3' });

      const response = await handle(healthRequest('https://any.example'));

      expect(response.headers.get('access-control-allow-origin')).toBe('*');
    });
  });
});
