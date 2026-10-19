import { Injectable } from '@angular/core';
import { utf8ToBytes } from '@noble/hashes/utils.js';
import {
  combineLatest,
  defer,
  filter,
  from,
  map,
  type Observable,
  switchMap,
  take,
  tap
} from 'rxjs';
import type { SignalMessage } from '../interfaces/signal-message';
import type { RoomId, Sid } from '../interfaces/signal-session';
import type { SignalTransport } from '../interfaces/signal-transport';
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

export interface HandshakeResult {
  signalingKey: CryptoKey;
  sas: string;
  roomId: RoomId;
}

export interface InitiatorSession {
  roomId: RoomId;
  sid: Sid;
  password: string;
}

type PakeMessage = Extract<SignalMessage, { type: 'pake' }>;
type PeerJoinedMessage = Extract<SignalMessage, { type: 'peer-joined' }>;

@Injectable({ providedIn: 'root' })
export class HandshakeService {
  runAsInitiator(
    transport: SignalTransport,
    session: InitiatorSession
  ): Observable<HandshakeResult> {
    const { roomId, sid, password } = session;
    const { secret, publicKey } = this.deriveKeyPair(sid, password);

    return this.peerJoined(transport).pipe(
      tap(() =>
        transport.send({ type: 'pake', y: encodeBase64Url(publicKey) })
      ),
      switchMap(() => this.peerKey(transport)),
      switchMap((peerPublicKey) =>
        this.finish(secret, publicKey, peerPublicKey, sid, roomId, true)
      )
    );
  }

  runAsResponder(
    transport: SignalTransport,
    code: string
  ): Observable<HandshakeResult> {
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
          false
        );
      })
    );
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
    ownIsInitiator: boolean
  ): Observable<HandshakeResult> {
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
    ).pipe(map(({ signalingKey, sas }) => ({ signalingKey, sas, roomId })));
  }
}
