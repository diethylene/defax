import { Injectable } from '@angular/core';
import { utf8ToBytes } from '@noble/hashes/utils.js';
import { Subject, takeUntil } from 'rxjs';
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

export class HandshakeAbortError extends Error {
  constructor() {
    super('handshake aborted');
    this.name = 'HandshakeAbortError';
  }
}

@Injectable()
export class HandshakeService {
  private readonly destroy$ = new Subject<void>();
  private transport: SignalTransport | null = null;

  async runAsInitiator(
    transport: SignalTransport,
    session: InitiatorSession
  ): Promise<HandshakeResult> {
    this.transport = transport;
    const { roomId, sid, password } = session;
    const { secret, publicKey } = this.deriveKeyPair(sid, password);

    const peerPublicKey = await this.exchangeAsInitiator(transport, publicKey);
    return this.complete(secret, publicKey, peerPublicKey, sid, roomId, true);
  }

  async runAsResponder(
    transport: SignalTransport,
    code: string
  ): Promise<HandshakeResult> {
    this.transport = transport;
    const { roomId, password } = parsePasscode(code);

    const peerKey = this.waitForPeerKey(transport);
    const [sid, peerPublicKey] = await Promise.all([
      transport.joinRoom(roomId),
      peerKey
    ]);

    const { secret, publicKey } = this.deriveKeyPair(sid, password);
    transport.send({ type: 'pake', y: encodeBase64Url(publicKey) });
    return this.complete(secret, publicKey, peerPublicKey, sid, roomId, false);
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

  private exchangeAsInitiator(
    transport: SignalTransport,
    ownPublicKey: Uint8Array
  ): Promise<Uint8Array> {
    return new Promise((resolve, reject) => {
      let sent = false;
      const subscription = transport.messages$
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (message) => {
            if (message.type === 'peer-joined' && !sent) {
              sent = true;
              transport.send({
                type: 'pake',
                y: encodeBase64Url(ownPublicKey)
              });
              return;
            }
            if (message.type === 'pake') {
              const peerKey = this.decodePeerKey(message.y);
              subscription.unsubscribe();
              resolve(peerKey);
            }
          },
          error: reject,
          complete: () => reject(new HandshakeAbortError())
        });
    });
  }

  private waitForPeerKey(transport: SignalTransport): Promise<Uint8Array> {
    return new Promise((resolve, reject) => {
      const subscription = transport.messages$
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (message) => {
            if (message.type !== 'pake') return;
            const peerKey = this.decodePeerKey(message.y);
            subscription.unsubscribe();
            resolve(peerKey);
          },
          error: reject,
          complete: () => reject(new HandshakeAbortError())
        });
    });
  }

  private decodePeerKey(value: string): Uint8Array {
    const key = decodeBase64Url(value);
    if (!isValidPublicKey(key)) {
      throw new Error('invalid peer public key');
    }
    return key;
  }

  private async complete(
    secret: bigint,
    ownPublicKey: Uint8Array,
    peerPublicKey: Uint8Array,
    sid: Sid,
    roomId: RoomId,
    ownIsInitiator: boolean
  ): Promise<HandshakeResult> {
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
    const { signalingKey, sas } = await deriveSessionKeys(
      isk as Uint8Array<ArrayBuffer>,
      sid as Uint8Array<ArrayBuffer>
    );
    return { signalingKey, sas, roomId };
  }
}
