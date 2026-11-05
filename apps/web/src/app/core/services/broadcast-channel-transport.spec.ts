import { encodeBase64Url } from '@contract/signal/base64url.util';
import type { SignalMessage } from '../../shared/utilities/signal-message';
import { BroadcastChannelTransport } from './broadcast-channel-transport';

const pakeY = encodeBase64Url(new Uint8Array(32).fill(1));

describe('BroadcastChannelTransport room lifecycle', () => {
  it('creates a room with a room id and a base64url sid', () => {
    const host = new BroadcastChannelTransport();
    const room = host.createRoom();
    expect(room.roomId).toMatch(/^[1-9]\d{5}$/);
    expect(room.sid).toMatch(/^[A-Za-z0-9_-]{22}$/);
    host.close();
  });

  it('notifies the host, hands out the sid, and relays messages sent after the join', async () => {
    const host = new BroadcastChannelTransport();
    const guest = new BroadcastChannelTransport();
    const guestReceived: SignalMessage[] = [];
    guest.messages$.subscribe((message) => guestReceived.push(message));
    const hostReceived: SignalMessage[] = [];
    host.messages$.subscribe((message) => hostReceived.push(message));

    const room = host.createRoom();
    const sid = await guest.joinRoom(room.roomId);
    host.send({ type: 'pake', y: pakeY });
    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(sid).toEqual(room.sid);
    expect(guestReceived[0]).toEqual({ type: 'joined', sid: room.sid });
    expect(guestReceived[1]).toEqual({ type: 'pake', y: pakeY });
    expect(hostReceived.some((message) => message.type === 'peer-joined')).toBe(true);

    host.close();
    guest.close();
  });

  it('does not hold messages sent before a guest joins', async () => {
    const host = new BroadcastChannelTransport();
    const guest = new BroadcastChannelTransport();
    const guestReceived: SignalMessage[] = [];
    guest.messages$.subscribe((message) => guestReceived.push(message));

    const room = host.createRoom();
    host.send({ type: 'pake', y: pakeY });

    await guest.joinRoom(room.roomId);
    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(guestReceived).toEqual([{ type: 'joined', sid: room.sid }]);

    host.close();
    guest.close();
  });
});

describe('BroadcastChannelTransport join rejection', () => {
  it('rejects a second join as room-full', async () => {
    const host = new BroadcastChannelTransport();
    const first = new BroadcastChannelTransport();
    const second = new BroadcastChannelTransport();

    const room = host.createRoom();
    await first.joinRoom(room.roomId);
    await expect(second.joinRoom(room.roomId)).rejects.toThrow('room-full');

    host.close();
    first.close();
    second.close();
  });

  it('rejects a join that speaks an unknown protocol', async () => {
    const host = new BroadcastChannelTransport();
    const room = host.createRoom();

    const rogue = new BroadcastChannel(`room-${room.roomId}`);
    const received: SignalMessage[] = [];
    rogue.addEventListener('message', (event: MessageEvent) => {
      received.push(event.data as SignalMessage);
    });

    rogue.postMessage({ type: 'join', protocol: 999 });

    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(received).toEqual([{ type: 'error', code: 'protocol-mismatch' }]);

    rogue.close();
    host.close();
  });

  it('stops delivery after close', async () => {
    const host = new BroadcastChannelTransport();
    const guest = new BroadcastChannelTransport();

    const room = host.createRoom();
    await guest.joinRoom(room.roomId);

    const received: SignalMessage[] = [];
    guest.messages$.subscribe((message) => received.push(message));

    guest.close();
    host.send({ type: 'pake', y: pakeY });
    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(received).toHaveLength(0);

    host.close();
  });
});
