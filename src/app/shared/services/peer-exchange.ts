import { combineLatest, map, type Observable, switchMap } from 'rxjs';
import { match } from 'ts-pattern';
import type { FileMetadata } from '../interfaces/file-metadata';
import type { Identity } from '../interfaces/identity';
import { parseFileMetadata } from '../validators/file-metadata';
import { parseIdentity } from '../validators/identity';
import type { SealedChannel } from './sealed-channel';

export interface PeerDescriptor {
  peerIdentity: Identity;
  fileInfo: FileMetadata | null;
}

export function exchangePeerInfo(
  channel: SealedChannel,
  identity: Identity,
  file: FileMetadata | null
): Observable<PeerDescriptor> {
  return match(channel.role)
    .with('initiator', () => exchangeAsInitiator(channel, identity, file))
    .with('responder', () => exchangeAsResponder(channel, identity))
    .exhaustive();
}

function exchangeAsInitiator(
  channel: SealedChannel,
  identity: Identity,
  file: FileMetadata | null
): Observable<PeerDescriptor> {
  if (!file) throw new Error('initiator requires file metadata');
  return combineLatest([
    channel.send('peer-info', identity),
    channel.send('file', file)
  ]).pipe(
    switchMap(() =>
      channel
        .receive('peer-info', parseIdentity)
        .pipe(map((peerIdentity) => ({ peerIdentity, fileInfo: null })))
    )
  );
}

function exchangeAsResponder(
  channel: SealedChannel,
  identity: Identity
): Observable<PeerDescriptor> {
  const sendIdentity$ = channel.send('peer-info', identity);
  return combineLatest([
    channel.receive('peer-info', parseIdentity),
    channel.receive('file', parseFileMetadata)
  ]).pipe(
    switchMap(([peerIdentity, fileInfo]) =>
      sendIdentity$.pipe(map(() => ({ peerIdentity, fileInfo })))
    )
  );
}
