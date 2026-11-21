import { TestBed } from '@angular/core/testing';
import { encodeBase64Url } from '@contract/signal/base64url.util';
import { PROTOCOL_VERSION } from '@contract/signal/protocol-version.constant';
import type { RoomCreated } from '@contract/signal/room-created.model';
import { roomIdFromValue } from '@contract/signal/room-id.model';
import { type Sid, sidFromBytes } from '@contract/signal/sid.model';
import * as Result from 'effect/Result';
import { firstValueFrom, of } from 'rxjs';
import { beforeEach, describe, expect, it } from 'vitest';
import { RoomsApiService } from '../api/rooms-api.service';
import type { RoomsApiError } from '../api/rooms-api-errors.model';
import { RoomsRequestFailed } from '../api/rooms-api-errors.model';
import { ServerTransport } from './server-transport.service';
import { FakeWebSocket } from './web-socket.fake';
import { WEB_SOCKET_CONSTRUCTOR } from './web-socket-constructor.token';

const pakeY = encodeBase64Url(new Uint8Array(32).fill(1));

const roomId = roomIdFromValue(42);
const hostSid = sidFromBytes(new Uint8Array(16).fill(1));
const room: RoomCreated = { roomId, sid: hostSid };

/**
 * Builds a transport whose room API reports one fixed result.
 * @param result Result the API returns.
 * @returns The transport under test.
 */
const transportWith = (result: Result.Result<RoomCreated, RoomsApiError>): ServerTransport => {
  TestBed.configureTestingModule({
    providers: [
      ServerTransport,
      { provide: RoomsApiService, useValue: { createRoom: () => of(result) } },
      { provide: WEB_SOCKET_CONSTRUCTOR, useValue: FakeWebSocket },
    ],
  });
  return TestBed.inject(ServerTransport);
};

/**
 * Waits for the transport to ask the fake for a socket.
 * @returns The socket the transport opened.
 */
const socketAfterConnect = async (): Promise<FakeWebSocket> => {
  await Promise.resolve();
  const socket = FakeWebSocket.instances.at(-1);
  if (!socket) throw new Error('the transport opened no socket');
  return socket;
};

/**
 * Opens a transport as the host, with the socket connected.
 * @returns The transport and its socket.
 */
const hostTransport = async (): Promise<{ transport: ServerTransport; socket: FakeWebSocket }> => {
  const transport = transportWith(Result.succeed(room));
  const created = firstValueFrom(transport.createRoom());
  const socket = await socketAfterConnect();
  socket.open();
  await created;
  return { transport, socket };
};

/**
 * Starts a guest join and takes the socket up to open.
 * @returns The transport, its socket, and the pending join.
 */
const guestTransport = async (): Promise<{
  transport: ServerTransport;
  socket: FakeWebSocket;
  joined: Promise<Sid>;
}> => {
  const transport = transportWith(Result.succeed(room));
  const joined = firstValueFrom(transport.joinRoom(roomId));
  const socket = await socketAfterConnect();
  socket.open();
  await Promise.resolve();
  return { transport, socket, joined };
};

beforeEach(() => {
  FakeWebSocket.reset();
  TestBed.resetTestingModule();
});

describe('ServerTransport createRoom', () => {
  describe('success', () => {
    it('opens the host socket and resolves once it connects', async () => {
      const transport = transportWith(Result.succeed(room));

      const created = firstValueFrom(transport.createRoom());
      const socket = await socketAfterConnect();
      socket.open();

      await expect(created).resolves.toEqual(room);
      expect(socket.url.endsWith(`/rooms/${room.roomId}/ws?sid=${room.sid}`)).toBe(true);
    });
  });

  describe('invariants', () => {
    it('rejects without opening a socket when the API reports a failure', async () => {
      const transport = transportWith(Result.fail(new RoomsRequestFailed({ cause: 'boom' })));

      await expect(firstValueFrom(transport.createRoom())).rejects.toMatchObject({
        _tag: 'RoomsRequestFailed',
      });
      expect(FakeWebSocket.instances).toHaveLength(0);
    });

    it('rejects when the socket fails before it opens', async () => {
      const transport = transportWith(Result.succeed(room));

      const created = firstValueFrom(transport.createRoom());
      const socket = await socketAfterConnect();
      socket.fail();

      await expect(created).rejects.toThrow('relay socket failed');
    });
  });
});

describe('ServerTransport joinRoom', () => {
  describe('success', () => {
    it('sends join on open and resolves with the host sid', async () => {
      const { socket, joined } = await guestTransport();

      expect(socket.sent).toEqual([JSON.stringify({ type: 'join', protocol: PROTOCOL_VERSION })]);
      expect(socket.url.endsWith(`/rooms/${roomId}/ws`)).toBe(true);

      socket.receive({ type: 'joined', sid: hostSid });

      await expect(joined).resolves.toBe(hostSid);
    });
  });

  describe('invariants', () => {
    it('rejects with the relay error code when the relay refuses the join', async () => {
      const { socket, joined } = await guestTransport();

      socket.receive({ type: 'error', code: 'room-full' });

      await expect(joined).rejects.toThrow('room-full');
    });

    it('rejects when the socket closes before the join is answered', async () => {
      const { socket, joined } = await guestTransport();

      socket.closeFromRelay();

      await expect(joined).rejects.toThrow('relay socket closed');
    });
  });
});

describe('ServerTransport send', () => {
  describe('success', () => {
    it('writes the frame as JSON to the open socket', async () => {
      const { transport, socket } = await hostTransport();

      transport.send({ type: 'pake', y: pakeY });

      expect(socket.sent).toEqual([JSON.stringify({ type: 'pake', y: pakeY })]);
    });
  });

  describe('invariants', () => {
    it('writes nothing after the transport is closed', async () => {
      const { transport, socket } = await hostTransport();

      transport.close();
      transport.send({ type: 'pake', y: pakeY });

      expect(socket.sent).toEqual([]);
    });
  });
});

describe('ServerTransport close', () => {
  describe('invariants', () => {
    it('closes the socket and rejects a pending join', async () => {
      const { transport, socket, joined } = await guestTransport();

      transport.close();

      await expect(joined).rejects.toThrow('Transport closed');
      expect(socket.readyState).toBe(FakeWebSocket.CLOSED);
      expect(socket.sent).toHaveLength(1);
    });
  });
});

describe('ServerTransport messages$', () => {
  describe('success', () => {
    it('emits every parsed inbound frame', async () => {
      const { transport, socket } = await hostTransport();
      const received: unknown[] = [];
      transport.messages$.subscribe((message) => received.push(message));

      socket.receive({ type: 'peer-joined' });
      socket.receive({ type: 'pake', y: pakeY });

      expect(received).toEqual([{ type: 'peer-joined' }, { type: 'pake', y: pakeY }]);
    });
  });

  describe('invariants', () => {
    it('skips frames that do not match the wire contract', async () => {
      const { transport, socket } = await hostTransport();
      const received: unknown[] = [];
      transport.messages$.subscribe((message) => received.push(message));

      socket.receive({ type: 'nope' });

      expect(received).toEqual([]);
    });
  });
});
