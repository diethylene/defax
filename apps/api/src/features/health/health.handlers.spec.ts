import { AppLayer } from '@api/core/http/app.layer';
import { Health } from '@contract/health/health.model';
import { apiEnvelopeOf } from '@contract/http/api-envelope.model';
import * as ConfigProvider from 'effect/ConfigProvider';
import { HttpRouter } from 'effect/http';
import * as Layer from 'effect/Layer';
import * as Schema from 'effect/Schema';
import { describe, expect, it, onTestFinished } from 'vitest';
import { FakeRoomsNamespace } from '../rooms/rooms-namespace.fake';
import { RoomsNamespace } from '../rooms/rooms-namespace.service';

/** Schema of the successful health response. */
const HealthEnvelope = apiEnvelopeOf(Health);

/**
 * Builds the app's fetch handler with the given env vars, the same shape the Worker serves.
 * @param env Environment variables the app reads through Config.
 * @returns A function from Request to Response.
 */
const handlerWith = (env: Record<string, string>): ((request: Request) => Promise<Response>) => {
  const { handler, dispose } = HttpRouter.toWebHandler(
    AppLayer.pipe(
      Layer.provide(Layer.succeed(RoomsNamespace, { namespace: new FakeRoomsNamespace() })),
      Layer.provide(ConfigProvider.layer(ConfigProvider.fromUnknown(env))),
    ),
    { disableLogger: true },
  );
  onTestFinished(dispose);
  return (request) => handler(request);
};

describe('GET /api/health', () => {
  describe('success', () => {
    it('reports ok with the configured version in the success envelope', async () => {
      const handle = handlerWith({ APP_VERSION: '1.2.3' });

      const response = await handle(new Request('http://local/api/health'));
      const body: unknown = await response.json();
      const envelope = Schema.decodeUnknownSync(HealthEnvelope)(body);

      expect(response.status).toBe(200);
      expect(envelope).toEqual({
        status: 'success',
        data: { status: 'ok', version: '1.2.3' },
        meta: {
          requestId: response.headers.get('x-request-id'),
          timestamp: envelope.meta.timestamp,
          apiVersion: '1.2.3',
        },
      });
      expect(Number.isNaN(Date.parse(envelope.meta.timestamp))).toBe(false);
    });
  });

  describe('invariants', () => {
    it('refuses to start when APP_VERSION is not configured', async () => {
      const handle = handlerWith({});

      await expect(handle(new Request('http://local/api/health'))).rejects.toThrow();
    });
  });
});
