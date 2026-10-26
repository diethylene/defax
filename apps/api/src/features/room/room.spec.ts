import { beforeEach, describe, expect, it } from 'vitest';
import { Room, type RoomEnv } from './room';
import { sidFixture, yFixture } from './room.factory';
import { FakeState, type FakeWebSocket, installWebSocketPair, patchResponse } from './room.harness';

/**
 * Builds a room over in-memory state.
 * @param env Environment bindings for the room.
 * @returns The fake state and the room under test.
 */
const setup = (env: RoomEnv = {}) => {
  const state = new FakeState();
  const room = new Room(state as unknown as DurableObjectState, env);
  return { state, room };
};

/**
 * Returns one accepted socket, failing loudly when the room accepted none.
 * @param state Fake state holding the sockets.
 * @param tag Tag to look up.
 * @returns The accepted socket.
 */
const socketFor = (state: FakeState, tag: string): FakeWebSocket => {
  const socket = state.getWebSockets(tag)[0];
  if (socket === undefined) throw new Error(`no ${tag} socket`);
  return socket;
};

/** URL the room initializes through. */
const initUrl = 'http://x/rooms/r1/init';
/** URL peers upgrade through. */
const wsUrl = 'http://x/rooms/r1/ws';

/**
 * Initializes the room with a session id.
 * @param room Room under test.
 * @param sid Session id to store.
 * @returns The init response.
 */
const init = (room: Room, sid: string): Promise<Response> =>
  room.fetch(new Request(initUrl, { method: 'POST', body: sid }));

describe('Room', () => {
  beforeEach(() => {
    installWebSocketPair();
    patchResponse();
  });

  describe('success', () => {
    it('relays a full handshake and erases on disconnect', async () => {
      const { state, room } = setup();
      const sid = sidFixture();
      const y = yFixture();

      expect((await init(room, sid)).status).toBe(204);

      const initiatorUpgrade = await room.fetch(new Request(`${wsUrl}?sid=${sid}`));
      expect(initiatorUpgrade.status).toBe(101);
      const initiator = socketFor(state, 'initiator');

      const responderUpgrade = await room.fetch(new Request(wsUrl));
      expect(responderUpgrade.status).toBe(101);
      const responder = socketFor(state, 'responder');

      await room.webSocketMessage(
        responder as unknown as WebSocket,
        JSON.stringify({ type: 'join', protocol: 1 }),
      );
      expect(initiator.sent).toEqual([JSON.stringify({ type: 'peer-joined' })]);
      expect(responder.sent).toEqual([JSON.stringify({ type: 'joined', sid })]);

      await room.webSocketMessage(
        initiator as unknown as WebSocket,
        JSON.stringify({ type: 'pake', y }),
      );
      expect(responder.sent).toContain(JSON.stringify({ type: 'pake', y }));

      await room.webSocketMessage(
        responder as unknown as WebSocket,
        JSON.stringify({ type: 'pake', y }),
      );
      expect(initiator.sent).toContain(JSON.stringify({ type: 'pake', y }));

      await room.webSocketMessage(
        initiator as unknown as WebSocket,
        JSON.stringify({ type: 'sealed', kind: 'rtc-offer', ct: 'cipher' }),
      );
      expect(responder.sent).toContain(
        JSON.stringify({ type: 'sealed', kind: 'rtc-offer', ct: 'cipher' }),
      );

      await room.webSocketClose(initiator as unknown as WebSocket);
      expect(responder.sent).toContain(JSON.stringify({ type: 'error', code: 'peer-failed' }));
      expect(responder.closed).toBe(true);
      expect(state.storage.deletedAll).toBe(true);
      expect(state.storage.alarm).toBeNull();
    });

    it('arms the expiry alarm on init', async () => {
      const { state, room } = setup({ ROOM_TTL_MS: '60000' });

      await init(room, sidFixture());
      expect(state.storage.alarm).not.toBeNull();
      expect(state.storage.alarm ?? 0).toBeGreaterThan(Date.now());
    });
  });

  describe('invariants', () => {
    it('rejects a third connection', async () => {
      const { state, room } = setup();
      const sid = sidFixture();

      await init(room, sid);
      await room.fetch(new Request(`${wsUrl}?sid=${sid}`));
      expect((await room.fetch(new Request(wsUrl))).status).toBe(101);
      expect(state.getWebSockets()).toHaveLength(2);

      const third = await room.fetch(new Request(wsUrl));
      expect(third.status).toBe(409);
      expect(await third.json()).toEqual({ code: 'room-full' });
    });

    it('rejects an initiator with a mismatched sid', async () => {
      const { room } = setup();
      const sid = sidFixture();

      await init(room, sid);
      expect((await room.fetch(new Request(`${wsUrl}?sid=wrong`))).status).toBe(403);
    });

    it('rejects a connection before the room is initialized', async () => {
      const { room } = setup();
      expect((await room.fetch(new Request(wsUrl))).status).toBe(404);
    });

    it('kills on a protocol version mismatch', async () => {
      const { state, room } = setup();
      const sid = sidFixture();

      await init(room, sid);
      await room.fetch(new Request(`${wsUrl}?sid=${sid}`));
      await room.fetch(new Request(wsUrl));
      const responder = socketFor(state, 'responder');

      await room.webSocketMessage(
        responder as unknown as WebSocket,
        JSON.stringify({ type: 'join', protocol: 999 }),
      );
      expect(responder.sent).toContain(
        JSON.stringify({ type: 'error', code: 'protocol-mismatch' }),
      );
      expect(state.storage.deletedAll).toBe(true);
    });

    it('kills on a malformed message', async () => {
      const { state, room } = setup();
      const sid = sidFixture();

      await init(room, sid);
      await room.fetch(new Request(`${wsUrl}?sid=${sid}`));
      const initiator = socketFor(state, 'initiator');

      await room.webSocketMessage(initiator as unknown as WebSocket, 'not json');
      expect(state.storage.deletedAll).toBe(true);
    });

    it('kills and notifies on expiry', async () => {
      const { state, room } = setup();
      const sid = sidFixture();

      await init(room, sid);
      await room.fetch(new Request(`${wsUrl}?sid=${sid}`));
      const initiator = socketFor(state, 'initiator');
      await room.fetch(new Request(wsUrl));
      const responder = socketFor(state, 'responder');
      await room.webSocketMessage(
        responder as unknown as WebSocket,
        JSON.stringify({ type: 'join', protocol: 1 }),
      );

      await room.alarm();
      expect(initiator.sent).toContain(JSON.stringify({ type: 'error', code: 'room-expired' }));
      expect(responder.sent).toContain(JSON.stringify({ type: 'error', code: 'room-expired' }));
      expect(state.storage.deletedAll).toBe(true);
    });

    it('refuses rejoin after the room ends', async () => {
      const { state, room } = setup();
      const sid = sidFixture();

      await init(room, sid);
      await room.fetch(new Request(`${wsUrl}?sid=${sid}`));
      await room.fetch(new Request(wsUrl));
      const initiator = socketFor(state, 'initiator');

      await room.webSocketClose(initiator as unknown as WebSocket);
      expect((await room.fetch(new Request(wsUrl))).status).toBe(404);
    });
  });
});
