import { Injectable } from '@angular/core';
import { utf8ToBytes } from '@noble/hashes/utils.js';
import {
  combineLatest,
  defer,
  filter,
  from,
  map,
  type Observable,
  Subject,
  switchMap,
  take,
  takeUntil,
  tap
} from 'rxjs';
import { match } from 'ts-pattern';
import type { FileMetadata } from '../interfaces/file-metadata';
import type { Identity } from '../interfaces/identity';
import type { SignalMessage } from '../interfaces/signal-message';
import type { RoomId, Sid } from '../interfaces/signal-session';
import type { SignalTransport } from '../interfaces/signal-transport';
import type { SignalRole } from '../utilities/aead';
import { decodeBase64Url, encodeBase64Url } from '../utilities/base64url';
import {
  deriveGeneratorString,
  derivePublicKey,
  deriveSharedSecret,
  isValidPublicKey,
  mapToGroup,
  secretFromBytes
} from '../utilities/cpace';
import { deriveSessionKeys } from '../utilities/hkdf';
import { deriveIsk } from '../utilities/isk';
import { parsePasscode } from '../utilities/passcode';
import { normalizePassword } from '../utilities/password';
import { parseFileMetadata } from '../validators/file-metadata';
import { parseIdentity } from '../validators/identity';
import { SealedChannel } from './sealed-channel';

export interface HandshakeResult {
  signalingKey: CryptoKey;
  sas: string;
  roomId: RoomId;
  peerIdentity: Identity;
  fileInfo: FileMetadata | null;
}

export interface InitiatorSession {
  roomId: RoomId;
  sid: Sid;
  password: string;
  identity: Identity;
  file: FileMetadata;
}

type PakeMessage = Extract<SignalMessage, { type: 'pake' }>;
type PeerJoinedMessage = Extract<SignalMessage, { type: 'peer-joined' }>;

@Injectable()
export class HandshakeService {
  private readonly destroy$ = new Subject<void>();
  private transport: SignalTransport | null = null;

  runAsInitiator(
    transport: SignalTransport,
    session: InitiatorSession
  ): Observable<HandshakeResult> {
    this.transport = transport;
    const { roomId, sid, password, identity, file } = session;
    const { secret, publicKey } = this.deriveKeyPair(sid, password);

    return this.peerJoined(transport).pipe(
      tap(() =>
        transport.send({ type: 'pake', y: encodeBase64Url(publicKey) })
      ),
      switchMap(() => this.peerKey(transport)),
      switchMap((peerPublicKey) =>
        this.finish(
          secret,
          publicKey,
          peerPublicKey,
          sid,
          roomId,
          'initiator',
          identity,
          file
        )
      ),
      takeUntil(this.destroy$)
    );
  }

  runAsResponder(
    transport: SignalTransport,
    code: string,
    identity: Identity
  ): Observable<HandshakeResult> {
    this.transport = transport;
    const { roomId, password } = parsePasscode(code);

    return combineLatest([
      this.peerKey(transport),
      defer(() => from(transport.joinRoom(roomId)))
    ]).pipe(
      switchMap(([peerPublicKey, sid]) => {
        const { secret, publicKey } = this.deriveKeyPair(sid, password);
        transport.send({ type: 'pake', y: encodeBase64Url(publicKey) });
        return this.finish(
          secret,
          publicKey,
          peerPublicKey,
          sid,
          roomId,
          'responder',
          identity,
          null
        );
      }),
      takeUntil(this.destroy$)
    );
  }

  destroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.transport?.close();
    this.transport = null;
  }

  private deriveKeyPair(
    sid: Sid,
    password: string
  ): { secret: bigint; publicKey: Uint8Array } {
    const generator = mapToGroup(
      deriveGeneratorString(sid, utf8ToBytes(normalizePassword(password)))
    );
    const secret = this.generateSecret();
    return { secret, publicKey: derivePublicKey(secret, generator) };
  }

  private generateSecret(): bigint {
    const bytes = crypto.getRandomValues(new Uint8Array(32));
    try {
      return secretFromBytes(bytes);
    } finally {
      bytes.fill(0);
    }
  }

  private peerJoined(
    transport: SignalTransport
  ): Observable<PeerJoinedMessage> {
    return transport.messages$.pipe(
      filter(
        (message): message is PeerJoinedMessage =>
          message.type === 'peer-joined'
      ),
      take(1)
    );
  }

  private peerKey(transport: SignalTransport): Observable<Uint8Array> {
    return transport.messages$.pipe(
      filter((message): message is PakeMessage => message.type === 'pake'),
      map((message) => this.decodePeerKey(message.y)),
      take(1)
    );
  }

  private decodePeerKey(value: string): Uint8Array {
    const key = decodeBase64Url(value);
    if (!isValidPublicKey(key)) {
      throw new Error('invalid peer public key');
    }
    return key;
  }

  private finish(
    secret: bigint,
    ownPublicKey: Uint8Array,
    peerPublicKey: Uint8Array,
    sid: Sid,
    roomId: RoomId,
    role: SignalRole,
    identity: Identity,
    file: FileMetadata | null
  ): Observable<HandshakeResult> {
    const ownIsInitiator = role === 'initiator';
    const sharedSecret = deriveSharedSecret(
      secret,
      peerPublicKey,
      ownPublicKey
    );
    const yInitiator = ownIsInitiator ? ownPublicKey : peerPublicKey;
    const yResponder = ownIsInitiator ? peerPublicKey : ownPublicKey;
    const isk = deriveIsk(sid, sharedSecret, yInitiator, yResponder);
    sharedSecret.fill(0);

    // Noble types widen to ArrayBufferLike; WebCrypto requires ArrayBuffer.
    return from(
      deriveSessionKeys(
        isk as Uint8Array<ArrayBuffer>,
        sid as Uint8Array<ArrayBuffer>
      )
    ).pipe(
      switchMap(({ signalingKey, sas }) =>
        this.exchangePeerInfo(signalingKey, roomId, role, identity, file).pipe(
          map(({ peerIdentity, fileInfo }) => ({
            signalingKey,
            sas,
            roomId,
            peerIdentity,
            fileInfo
          }))
        )
      )
    );
  }

  private exchangePeerInfo(
    key: CryptoKey,
    roomId: RoomId,
    role: SignalRole,
    identity: Identity,
    file: FileMetadata | null
  ): Observable<{ peerIdentity: Identity; fileInfo: FileMetadata | null }> {
    const transport = this.transport;
    if (!transport) throw new Error('handshake transport missing');

    const channel = new SealedChannel(transport, key, roomId, role);

    return match(role)
      .with('initiator', () =>
        this.exchangeAsInitiator(channel, identity, file)
      )
      .with('responder', () => this.exchangeAsResponder(channel, identity))
      .exhaustive();
  }

  private exchangeAsInitiator(
    channel: SealedChannel,
    identity: Identity,
    file: FileMetadata | null
  ): Observable<{ peerIdentity: Identity; fileInfo: FileMetadata | null }> {
    if (!file) throw new Error('initiator handshake missing file metadata');
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

  private exchangeAsResponder(
    channel: SealedChannel,
    identity: Identity
  ): Observable<{ peerIdentity: Identity; fileInfo: FileMetadata | null }> {
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
}
