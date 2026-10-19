import { firstValueFrom, Subject } from 'rxjs';
import type { FileMetadata } from '../interfaces/file-metadata';
import type { Identity } from '../interfaces/identity';
import type { SignalMessage } from '../interfaces/signal-message';
import type { RoomCreated, RoomId, Sid } from '../interfaces/signal-session';
import { SignalTransport } from '../interfaces/signal-transport';
import { exchangePeerInfo } from './peer-exchange';
import { SealedChannel } from './sealed-channel';

const initiatorIdentity: Identity = {
  browser: 'Chrome 122',
  os: 'macOS',
  timeZone: 'Europe/London',
  language: 'en-GB'
};

const responderIdentity: Identity = {
  browser: 'Firefox 121',
  os: 'Windows',
  timeZone: 'America/New_York',
  language: 'en-US'
};

const file: FileMetadata = {
  name: 'report.pdf',
  size: 12345,
  mime: 'application/pdf',
  extension: 'pdf',
  lastModified: 1700000000000
};

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

async function testKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, [
    'encrypt',
    'decrypt'
  ]);
}

describe('exchangePeerInfo', () => {
  it('exchanges identity and file metadata across peers', async () => {
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

    const [initiatorResult, responderResult] = await Promise.all([
      firstValueFrom(exchangePeerInfo(initiator, initiatorIdentity, file)),
      firstValueFrom(exchangePeerInfo(responder, responderIdentity, null))
    ]);

    expect(initiatorResult.peerIdentity).toEqual(responderIdentity);
    expect(initiatorResult.fileInfo).toBeNull();
    expect(responderResult.peerIdentity).toEqual(initiatorIdentity);
    expect(responderResult.fileInfo).toEqual(file);
  });
});
