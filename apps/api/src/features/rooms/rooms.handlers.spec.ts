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

describe('POST /rooms/create', () => {
  describe('success', () => {
    it('returns 201 with the stub room', async () => {
      const handle = handlerWith({ APP_VERSION: '0.0.0' });

      const response = await handle(new Request('http://local/rooms/create', { method: 'POST' }));

      expect(response.status).toBe(201);
      expect(await response.json()).toEqual({ id: 'stub', status: 'created' });
    });
  });
});
