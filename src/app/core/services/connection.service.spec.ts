import { Injector } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import type { FileMetadata } from '../../shared/interfaces/file-metadata';
import type { Identity } from '../../shared/interfaces/identity';
import { SignalTransport } from '../../shared/interfaces/signal-transport';
import { BroadcastChannelTransport } from './broadcast-channel-transport';
import { ConnectionService } from './connection.service';
import { HandshakeService } from './handshake.service';

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

function createConnection(transport: SignalTransport): ConnectionService {
  return Injector.create({
    providers: [
      { provide: SignalTransport, useValue: transport },
      { provide: HandshakeService, useClass: HandshakeService },
      { provide: ConnectionService, useClass: ConnectionService }
    ]
  }).get(ConnectionService);
}

describe('ConnectionService', () => {
  it('establishes a connection and exchanges peer info', async () => {
    const initiatorTransport = new BroadcastChannelTransport();
    const responderTransport = new BroadcastChannelTransport();
    const initiator = createConnection(initiatorTransport);
    const responder = createConnection(responderTransport);

    const session = initiator.createSession();
    const code = `${session.roomId}-${session.password}`;

    const [initiatorResult, responderResult] = await Promise.all([
      firstValueFrom(
        initiator.connectAsInitiator(session, initiatorIdentity, file)
      ),
      firstValueFrom(responder.connectAsResponder(code, responderIdentity))
    ]);

    expect(initiatorResult.sas).toBe(responderResult.sas);
    expect(initiatorResult.peerIdentity).toEqual(responderIdentity);
    expect(responderResult.peerIdentity).toEqual(initiatorIdentity);
    expect(responderResult.fileInfo).toEqual(file);
  });
});
