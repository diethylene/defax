import { firstValueFrom } from 'rxjs';
import { open, seal } from '../../shared/utilities/aead';
import { BroadcastChannelTransport } from './broadcast-channel-transport';
import { type HandshakeResult, HandshakeService } from './handshake.service';

const runHandshakePair = async (
  initiatorPassword: string,
  responderPassword: string,
): Promise<{
  initiatorResult: HandshakeResult;
  responderResult: HandshakeResult;
}> => {
  const initiatorTransport = new BroadcastChannelTransport();
  const responderTransport = new BroadcastChannelTransport();
  const initiator = new HandshakeService();
  const responder = new HandshakeService();

  const { roomId, sid } = initiatorTransport.createRoom();
  const [initiatorResult, responderResult] = await Promise.all([
    firstValueFrom(
      initiator.runAsInitiator(initiatorTransport, {
        roomId,
        sid,
        password: initiatorPassword,
      }),
    ),
    firstValueFrom(responder.runAsResponder(responderTransport, `${roomId}-${responderPassword}`)),
  ]);

  return { initiatorResult, responderResult };
};

describe('HandshakeService', () => {
  it('derives the same sas and room id on both sides', async () => {
    const pair = await runHandshakePair('apple-bird', 'apple-bird');

    expect(pair.initiatorResult.sas).toBe(pair.responderResult.sas);
    expect(pair.initiatorResult.roomId).toBe(pair.responderResult.roomId);
  });

  it('derives a signaling key that round-trips across peers', async () => {
    const pair = await runHandshakePair('apple-bird', 'apple-bird');
    const { roomId } = pair.initiatorResult;

    const sealed = await seal(
      pair.responderResult.signalingKey,
      new TextEncoder().encode('hello defax'),
      roomId,
      'responder',
    );
    const opened = await open(pair.initiatorResult.signalingKey, sealed, roomId, 'responder');

    expect(new TextDecoder().decode(opened)).toBe('hello defax');
  });

  it('derives different sas for mismatched passwords', async () => {
    const pair = await runHandshakePair('apple-bird', 'bird-cat');

    expect(pair.initiatorResult.sas).not.toBe(pair.responderResult.sas);
  });
});
