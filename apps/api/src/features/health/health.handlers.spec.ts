import { AppLayer } from '@api/core/http/app.layer';
import * as ConfigProvider from 'effect/ConfigProvider';
import { HttpRouter } from 'effect/http';
import * as Layer from 'effect/Layer';
import { describe, expect, it, onTestFinished } from 'vitest';

/**
 * Builds the app's fetch handler with the given env vars, the same shape the Worker serves.
 * @param env Environment variables the app reads through Config.
 * @returns A function from Request to Response.
 */
const handlerWith = (env: Record<string, string>): ((request: Request) => Promise<Response>) => {
  const { handler, dispose } = HttpRouter.toWebHandler(
    AppLayer.pipe(Layer.provide(ConfigProvider.layer(ConfigProvider.fromUnknown(env)))),
    { disableLogger: true },
  );
  onTestFinished(dispose);
  return (request) => handler(request);
};

describe('GET /api/health', () => {
  describe('success', () => {
    it('reports ok with the configured version', async () => {
      const handle = handlerWith({ APP_VERSION: '1.2.3' });

      const response = await handle(new Request('http://local/api/health'));

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ status: 'ok', version: '1.2.3' });
    });
  });

  describe('invariants', () => {
    it('refuses to start when APP_VERSION is not configured', async () => {
      const handle = handlerWith({});

      await expect(handle(new Request('http://local/api/health'))).rejects.toThrow();
    });
  });
});
