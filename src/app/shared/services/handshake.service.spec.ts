import { firstValueFrom } from 'rxjs';
import type { FileMetadata } from '../interfaces/file-metadata';
import type { Identity } from '../interfaces/identity';
import { open, seal } from '../utilities/aead';
import { BroadcastChannelTransport } from './broadcast-channel-transport';
import { type HandshakeResult, HandshakeService } from './handshake.service';

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

async function runHandshakePair(
  initiatorPassword: string,
  responderPassword: string
): Promise<{
  initiatorResult: HandshakeResult;
  responderResult: HandshakeResult;
  initiator: HandshakeService;
  responder: HandshakeService;
}> {
  const initiatorTransport = new BroadcastChannelTransport();
  const responderTransport = new BroadcastChannelTransport();
  const initiator = new HandshakeService();
  const responder = new HandshakeService();

  const { roomId, sid } = initiatorTransport.createRoom();
  try {
    const [initiatorResult, responderResult] = await Promise.all([
      firstValueFrom(
        initiator.runAsInitiator(initiatorTransport, {
          roomId,
          sid,
          password: initiatorPassword,
          identity: initiatorIdentity,
          file
        })
      ),
      firstValueFrom(
        responder.runAsResponder(
          responderTransport,
          `${roomId}-${responderPassword}`,
          responderIdentity
        )
      )
    ]);

    return { initiatorResult, responderResult, initiator, responder };
  } catch (error) {
    initiator.destroy();
    responder.destroy();
    throw error;
  }
}

describe('HandshakeService', () => {
  it('derives the same sas and room id on both sides', async () => {
    const pair = await runHandshakePair('apple-bird', 'apple-bird');

    expect(pair.initiatorResult.sas).toBe(pair.responderResult.sas);
    expect(pair.initiatorResult.roomId).toBe(pair.responderResult.roomId);

    pair.initiator.destroy();
    pair.responder.destroy();
  });

  it('exchanges peer identity and file metadata', async () => {
    const pair = await runHandshakePair('apple-bird', 'apple-bird');

    expect(pair.initiatorResult.peerIdentity).toEqual(responderIdentity);
    expect(pair.responderResult.peerIdentity).toEqual(initiatorIdentity);
    expect(pair.initiatorResult.fileInfo).toBeNull();
    expect(pair.responderResult.fileInfo).toEqual(file);

    pair.initiator.destroy();
    pair.responder.destroy();
  });

  it('derives a signaling key that round-trips across peers', async () => {
    const pair = await runHandshakePair('apple-bird', 'apple-bird');
    const { roomId } = pair.initiatorResult;

    const sealed = await seal(
      pair.responderResult.signalingKey,
      new TextEncoder().encode('hello defax'),
      roomId,
      'responder'
    );
    const opened = await open(
      pair.initiatorResult.signalingKey,
      sealed,
      roomId,
      'responder'
    );

    expect(new TextDecoder().decode(opened)).toBe('hello defax');

    pair.initiator.destroy();
    pair.responder.destroy();
  });

  it('rejects the handshake when passwords do not match', async () => {
    await expect(runHandshakePair('apple-bird', 'bird-cat')).rejects.toThrow();
  });
});

describe('HandshakeService teardown', () => {
  it('rejects an in-flight handshake on destroy', async () => {
    const transport = new BroadcastChannelTransport();
    const service = new HandshakeService();
    const { roomId, sid } = transport.createRoom();

    const pending = firstValueFrom(
      service.runAsInitiator(transport, {
        roomId,
        sid,
        password: 'apple-bird',
        identity: initiatorIdentity,
        file
      })
    );
    service.destroy();

    await expect(pending).rejects.toThrow();
  });
});
