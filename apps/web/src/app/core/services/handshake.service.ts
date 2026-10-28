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
  tap,
} from 'rxjs';
import type { RoomId, Sid } from '../../shared/interfaces/signal-session';
import type { SignalTransport } from '../../shared/interfaces/signal-transport';
import { decodeBase64Url, encodeBase64Url } from '../../shared/utilities/base64url';
import {
  deriveGeneratorString,
  derivePublicKey,
  deriveSharedSecret,
  isValidPublicKey,
  mapToGroup,
  secretFromBytes,
} from '../../shared/utilities/cpace';
import { deriveSessionKeys } from '../../shared/utilities/hkdf';
import { deriveIsk } from '../../shared/utilities/isk';
import { parsePasscode } from '../../shared/utilities/passcode';
import { normalizePassword } from '../../shared/utilities/password';
import type { SignalMessage } from '../../shared/utilities/signal-message';

/** Keys and code both peers hold after the handshake. */
export interface HandshakeResult {
  /** Key sealing and opening the signalling payloads. */
  signalingKey: CryptoKey;
  /** Short authentication string both peers compare out of band. */
  sas: string;
  /** Room the handshake ran in. */
  roomId: RoomId;
}

/** Session the initiator creates before waiting for a peer. */
export interface InitiatorSession {
  /** Room id the responder joins. */
  roomId: RoomId;
  /** Session id the responder receives on join. */
  sid: Sid;
  /** Password both peers derive the handshake from. */
  password: string;
}

/** PAKE message carrying the sender's public key. */
type PakeMessage = Extract<SignalMessage, { type: 'pake' }>;

/** Message announcing that a peer joined the room. */
type PeerJoinedMessage = Extract<SignalMessage, { type: 'peer-joined' }>;

/** Runs the CPace handshake and derives the signalling key. */
@Injectable({ providedIn: 'root' })
export class HandshakeService {
  /**
   * Waits for a peer and completes the handshake as the initiator.
   * @param transport Transport carrying the handshake messages.
   * @param session Session created by this side.
   * @returns Observable of the signalling key, sas, and room id.
   */
  runAsInitiator(
    transport: SignalTransport,
    session: InitiatorSession,
  ): Observable<HandshakeResult> {
    const { roomId, sid, password } = session;
    const { secret, publicKey } = this.deriveKeyPair(sid, password);

    return this.peerJoined(transport).pipe(
      tap(() => transport.send({ type: 'pake', y: encodeBase64Url(publicKey) })),
      switchMap(() => this.peerKey(transport)),
      switchMap((peerPublicKey) =>
        this.finish(secret, publicKey, peerPublicKey, sid, roomId, true),
      ),
    );
  }

  /**
   * Joins a room and completes the handshake as the responder.
   * @param transport Transport carrying the handshake messages.
   * @param code Passcode carrying the room id and password.
   * @returns Observable of the signalling key, sas, and room id.
   */
  runAsResponder(transport: SignalTransport, code: string): Observable<HandshakeResult> {
    const { roomId, password } = parsePasscode(code);

    return combineLatest([
      this.peerKey(transport),
      defer(() => from(transport.joinRoom(roomId))),
    ]).pipe(
      switchMap(([peerPublicKey, sid]) => {
        const { secret, publicKey } = this.deriveKeyPair(sid, password);
        transport.send({ type: 'pake', y: encodeBase64Url(publicKey) });
        return this.finish(secret, publicKey, peerPublicKey, sid, roomId, false);
      }),
    );
  }

  /**
   * Derives the CPace secret and public key for a session.
   * @param sid Session id both peers share.
   * @param password Password both peers share.
   * @returns The secret scalar and the public key.
   */
  private deriveKeyPair(sid: Sid, password: string): { secret: bigint; publicKey: Uint8Array } {
    const generator = mapToGroup(
      deriveGeneratorString(sid, utf8ToBytes(normalizePassword(password))),
    );
    const secret = this.generateSecret();
    return { secret, publicKey: derivePublicKey(secret, generator) };
  }

  /**
   * Draws a random CPace secret and zeroes its buffer.
   * @returns The secret scalar.
   */
  private generateSecret(): bigint {
    const bytes = crypto.getRandomValues(new Uint8Array(32));
    try {
      return secretFromBytes(bytes);
    } finally {
      bytes.fill(0);
    }
  }

  /**
   * Waits for the peer to join the room.
   * @param transport Transport carrying the handshake messages.
   * @returns Observable of the join announcement.
   */
  private peerJoined(transport: SignalTransport): Observable<PeerJoinedMessage> {
    return transport.messages$.pipe(
      filter((message): message is PeerJoinedMessage => message.type === 'peer-joined'),
      take(1),
    );
  }

  /**
   * Waits for the peer's PAKE message and decodes its public key.
   * @param transport Transport carrying the handshake messages.
   * @returns Observable of the peer's public key.
   */
  private peerKey(transport: SignalTransport): Observable<Uint8Array> {
    return transport.messages$.pipe(
      filter((message): message is PakeMessage => message.type === 'pake'),
      map((message) => this.decodePeerKey(message.y)),
      take(1),
    );
  }

  /**
   * Decodes a peer public key and rejects one outside the group.
   * @param value Base64url encoded public key.
   * @returns The decoded public key.
   */
  private decodePeerKey(value: string): Uint8Array {
    const key = decodeBase64Url(value);
    if (!isValidPublicKey(key)) {
      throw new Error('invalid peer public key');
    }
    return key;
  }

  /**
   * Derives the shared secret, ISK, and session keys.
   * @param secret Own CPace secret.
   * @param ownPublicKey Own public key.
   * @param peerPublicKey Peer public key.
   * @param sid Session id both peers share.
   * @param roomId Room the handshake ran in.
   * @param ownIsInitiator Whether this side initiated the handshake.
   * @returns Observable of the signalling key, sas, and room id.
   */
  private finish(
    secret: bigint,
    ownPublicKey: Uint8Array,
    peerPublicKey: Uint8Array,
    sid: Sid,
    roomId: RoomId,
    ownIsInitiator: boolean,
  ): Observable<HandshakeResult> {
    const sharedSecret = deriveSharedSecret(secret, peerPublicKey, ownPublicKey);
    const yInitiator = ownIsInitiator ? ownPublicKey : peerPublicKey;
    const yResponder = ownIsInitiator ? peerPublicKey : ownPublicKey;
    const isk = deriveIsk(sid, sharedSecret, yInitiator, yResponder);
    sharedSecret.fill(0);

    // Noble types widen to ArrayBufferLike; WebCrypto requires ArrayBuffer.
    return from(
      deriveSessionKeys(isk as Uint8Array<ArrayBuffer>, sid as Uint8Array<ArrayBuffer>),
    ).pipe(map(({ signalingKey, sas }) => ({ signalingKey, sas, roomId })));
  }
}
