import type { SignalMessage } from '../interfaces/signal-message';
import { BroadcastChannelTransport } from './broadcast-channel-transport';

describe('BroadcastChannelTransport', () => {
  it('creates a room with a room id and a 16-byte sid', () => {
    const host = new BroadcastChannelTransport();
    const room = host.createRoom();
    expect(room.roomId).toMatch(/^\d{6}$/);
    expect(room.sid).toBeInstanceOf(Uint8Array);
    expect(room.sid.length).toBe(16);
    host.close();
  });

  it('resolves the host sid and delivers queued messages on join', async () => {
    const host = new BroadcastChannelTransport();
    const guest = new BroadcastChannelTransport();
    const received: SignalMessage[] = [];
    guest.messages$.subscribe((message) => received.push(message));

    const room = host.createRoom();
    // Stand-in payload; real signaling messages replace this later.
    host.send({ type: 'join' });

    const sid = await guest.joinRoom(room.roomId);

    expect(sid).toEqual(room.sid);
    expect(received[0]).toEqual({ type: 'join' });
    expect(received[1]?.type).toBe('joined');

    host.close();
    guest.close();
  });

  it('rejects a second join', async () => {
    const host = new BroadcastChannelTransport();
    const first = new BroadcastChannelTransport();
    const second = new BroadcastChannelTransport();

    const room = host.createRoom();
    await first.joinRoom(room.roomId);
    await expect(second.joinRoom(room.roomId)).rejects.toThrow('full');

    host.close();
    first.close();
    second.close();
  });

  it('stops delivery after close', async () => {
    const host = new BroadcastChannelTransport();
    const guest = new BroadcastChannelTransport();

    const room = host.createRoom();
    await guest.joinRoom(room.roomId);

    const received: SignalMessage[] = [];
    guest.messages$.subscribe((message) => received.push(message));

    guest.close();
    host.send({ type: 'join' });
    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(received).toHaveLength(0);

    host.close();
  });
});
