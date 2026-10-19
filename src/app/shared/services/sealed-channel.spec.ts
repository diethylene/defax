import { firstValueFrom, Subject } from 'rxjs';
import type { SignalMessage } from '../interfaces/signal-message';
import type { RoomCreated, RoomId, Sid } from '../interfaces/signal-session';
import { SignalTransport } from '../interfaces/signal-transport';
import { SealedChannel } from './sealed-channel';

interface Payload {
  browser: string;
  os: string;
}

class LoopbackTransport extends SignalTransport {
  readonly messages = new Subject<SignalMessage>();
  override readonly messages$ = this.messages.asObservable();
  peer: LoopbackTransport | null = null;

  override createRoom(): RoomCreated {
    throw new Error('createRoom not used');
  }

  override joinRoom(_roomId: RoomId): Promise<Sid> {
    throw new Error('joinRoom not used');
  }

  override send(message: SignalMessage): void {
    this.peer?.messages.next(message);
  }

  override close(): void {
    this.messages.complete();
  }
}

function parse(json: string): Payload {
  return JSON.parse(json) as Payload;
}

async function testKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, [
    'encrypt',
    'decrypt'
  ]);
}

describe('SealedChannel', () => {
  it('round-trips a sealed payload across peers', async () => {
    const initiatorTransport = new LoopbackTransport();
    const responderTransport = new LoopbackTransport();
    initiatorTransport.peer = responderTransport;
    responderTransport.peer = initiatorTransport;

    const key = await testKey();
    const initiator = new SealedChannel(
      initiatorTransport,
      key,
      '482913',
      'initiator'
    );
    const responder = new SealedChannel(
      responderTransport,
      key,
      '482913',
      'responder'
    );

    const payload: Payload = { browser: 'Chrome 122', os: 'macOS' };

    const received = firstValueFrom(responder.receive('peer-info', parse));
    await firstValueFrom(initiator.send('peer-info', payload));

    await expect(received).resolves.toEqual(payload);
  });

  it('rejects a payload sealed with the wrong role', async () => {
    const initiatorTransport = new LoopbackTransport();
    const responderTransport = new LoopbackTransport();
    initiatorTransport.peer = responderTransport;
    responderTransport.peer = initiatorTransport;

    const key = await testKey();
    const initiator = new SealedChannel(
      initiatorTransport,
      key,
      '482913',
      'initiator'
    );
    const responder = new SealedChannel(
      responderTransport,
      key,
      '482913',
      'initiator'
    );

    const received = firstValueFrom(responder.receive('peer-info', parse));
    await firstValueFrom(
      initiator.send('peer-info', { browser: 'Chrome 122', os: 'macOS' })
    );

    await expect(received).rejects.toThrow();
  });
});
