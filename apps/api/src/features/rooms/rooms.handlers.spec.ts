import { AppLayer } from '@api/core/http/app.layer';
import { apiEnvelopeOf } from '@contract/http/api-envelope.model';
import { ProblemDetails } from '@contract/http/problem-details.model';
import { RoomCreated } from '@contract/signal/room-created.model';
import * as ConfigProvider from 'effect/ConfigProvider';
import { HttpRouter } from 'effect/http';
import * as Layer from 'effect/Layer';
import * as Schema from 'effect/Schema';
import { describe, expect, it, onTestFinished } from 'vitest';
import { FakeRoomsNamespace } from './rooms-namespace.fake';
import { RoomsNamespace } from './rooms-namespace.service';

/** Schema of the successful create response. */
const CreatedEnvelope = apiEnvelopeOf(RoomCreated);

/**
 * Builds the app's fetch handler with the given env vars and room namespace.
 * @param env Environment variables the app reads through Config.
 * @param rooms In-memory namespace standing in for the ROOMS binding.
 * @returns A function from Request to Response.
 */
const handlerWith = (
  env: Record<string, string>,
  rooms: FakeRoomsNamespace,
): ((request: Request) => Promise<Response>) => {
  const { handler, dispose } = HttpRouter.toWebHandler(
    AppLayer.pipe(
      Layer.provide(Layer.succeed(RoomsNamespace, { namespace: rooms })),
      Layer.provide(ConfigProvider.layer(ConfigProvider.fromUnknown(env))),
    ),
    { disableLogger: true },
  );
  onTestFinished(dispose);
  return (request) => handler(request);
};

describe('POST /rooms/create', () => {
  describe('success', () => {
    it('returns 201 with a room code and a session id', async () => {
      const rooms = new FakeRoomsNamespace();
      const handle = handlerWith({ APP_VERSION: '1.2.3' }, rooms);

      const response = await handle(new Request('http://local/rooms/create', { method: 'POST' }));
      const body: unknown = await response.json();
      const envelope = Schema.decodeUnknownSync(CreatedEnvelope)(body);

      expect(response.status).toBe(201);
      expect(envelope.status).toBe('success');
      expect(envelope.data.roomId).toMatch(/^[1-9]\d{5}$/);
      expect(envelope.data.sid).toMatch(/^[A-Za-z0-9_-]{22}$/);
      expect(envelope.meta.apiVersion).toBe('1.2.3');
      expect(envelope.meta.requestId).toBe(response.headers.get('x-request-id'));
      expect(Number.isNaN(Date.parse(envelope.meta.timestamp))).toBe(false);
    });

    it('initializes the room named by the returned code with the returned sid', async () => {
      const rooms = new FakeRoomsNamespace();
      const handle = handlerWith({ APP_VERSION: '1.2.3' }, rooms);

      const response = await handle(new Request('http://local/rooms/create', { method: 'POST' }));
      const body: unknown = await response.json();
      const envelope = Schema.decodeUnknownSync(CreatedEnvelope)(body);

      expect(rooms.inits).toEqual([{ name: envelope.data.roomId, sid: envelope.data.sid }]);
    });
  });

  describe('invariants', () => {
    it('returns 500 problem+json when the room fails to initialize', async () => {
      const handle = handlerWith({ APP_VERSION: '1.2.3' }, FakeRoomsNamespace.failing());

      const response = await handle(new Request('http://local/rooms/create', { method: 'POST' }));
      const body: unknown = await response.json();
      const problem = Schema.decodeUnknownSync(ProblemDetails)(body);

      expect(response.status).toBe(500);
      expect(response.headers.get('content-type')).toContain('application/problem+json');
      expect(problem.type).toBe('about:blank');
      expect(problem.title).toBe('Internal Server Error');
      expect(problem.status).toBe(500);
      expect(problem.requestId).toBe(response.headers.get('x-request-id'));
      expect(problem).not.toHaveProperty('detail');
    });
  });
});
