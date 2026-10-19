import { Injectable, inject } from '@angular/core';
import { utf8ToBytes } from '@noble/hashes/utils.js';
import {
  catchError,
  combineLatest,
  defer,
  EMPTY,
  filter,
  finalize,
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
import type { RoomId } from '../interfaces/signal-session';
import { SignalTransport } from '../interfaces/signal-transport';
import { open, type SignalRole, seal } from '../utilities/aead';
import { decodeBase64Url, encodeBase64Url } from '../utilities/base64url';
import { generatePassword } from '../utilities/password';
import { parseFileMetadata } from '../validators/file-metadata';
import { parseIdentity } from '../validators/identity';
import { HandshakeService, type InitiatorSession } from './handshake.service';

export interface InitiatorConnection {
  sas: string;
  peerIdentity: Identity;
}

export interface ResponderConnection {
  sas: string;
  peerIdentity: Identity;
  fileInfo: FileMetadata | null;
}

export interface DisconnectNotice {
  cancelledBy: 'sender' | 'receiver';
}

type SealedKind = 'peer-info' | 'file' | 'disconnect' | 'file-hash';
type SealedMessage = Extract<SignalMessage, { type: 'sealed' }>;

const decoder = new TextDecoder();

function parseDisconnect(json: string): DisconnectNotice {
  const value = JSON.parse(json) as DisconnectNotice;
  if (value.cancelledBy !== 'sender' && value.cancelledBy !== 'receiver') {
    throw new Error('invalid disconnect notice');
  }
  return value;
}

function parseFileHash(json: string): string {
  const value = JSON.parse(json) as { digest?: unknown };
  if (typeof value.digest !== 'string' || value.digest.length === 0) {
    throw new Error('invalid file hash');
  }
  return value.digest;
}

@Injectable({ providedIn: 'root' })
export class ConnectionService {
  private readonly transport = inject(SignalTransport);
  private readonly handshake = inject(HandshakeService);
  private readonly close$ = new Subject<void>();
  private readonly disconnect$ = new Subject<DisconnectNotice>();
  private readonly fileHash$ = new Subject<string>();

  readonly peerDisconnected$ = this.disconnect$.asObservable();
  readonly peerFileHash$ = this.fileHash$.asObservable();

  private signalingKey: CryptoKey | null = null;
  private roomId: RoomId | null = null;
  private role: SignalRole | null = null;

  constructor() {
    this.receiveSealedStream('disconnect', parseDisconnect).subscribe(
      (notice) => this.disconnect$.next(notice)
    );
    this.receiveSealedStream('file-hash', parseFileHash).subscribe((digest) =>
      this.fileHash$.next(digest)
    );
  }

  createSession(): InitiatorSession {
    const { roomId, sid } = this.transport.createRoom();
    return { roomId, sid, password: generatePassword() };
  }

  connectAsInitiator(
    session: InitiatorSession,
    identity: Identity,
    file: FileMetadata
  ): Observable<InitiatorConnection> {
    this.role = 'initiator';
    this.roomId = session.roomId;
    return this.handshake.runAsInitiator(this.transport, session).pipe(
      switchMap(({ signalingKey, sas }) => {
        this.signalingKey = signalingKey;
        return this.exchangeAsInitiator(identity, file).pipe(
          map((peerIdentity) => ({ sas, peerIdentity }))
        );
      }),
      takeUntil(this.close$)
    );
  }

  connectAsResponder(
    code: string,
    identity: Identity
  ): Observable<ResponderConnection> {
    this.role = 'responder';
    return defer(() =>
      this.handshake.runAsResponder(this.transport, code)
    ).pipe(
      switchMap(({ signalingKey, sas, roomId }) => {
        this.signalingKey = signalingKey;
        this.roomId = roomId;
        return this.exchangeAsResponder(identity).pipe(
          map(({ peerIdentity, fileInfo }) => ({ sas, peerIdentity, fileInfo }))
        );
      }),
      takeUntil(this.close$)
    );
  }

  sendSealed(kind: SealedKind, payload: unknown): Observable<void> {
    const key = this.signalingKey;
    const roomId = this.roomId;
    const role = this.role;
    if (!key || !roomId || !role) {
      throw new Error('connection not established');
    }
    return defer(() =>
      from(seal(key, utf8ToBytes(JSON.stringify(payload)), roomId, role)).pipe(
        tap((ct) =>
          this.transport.send({
            type: 'sealed',
            kind,
            ct: encodeBase64Url(ct)
          })
        ),
        map(() => undefined)
      )
    );
  }

  receiveSealed<T>(
    kind: SealedKind,
    parse: (json: string) => T
  ): Observable<T> {
    const key = this.signalingKey;
    const roomId = this.roomId;
    const role = this.role;
    if (!key || !roomId || !role) {
      throw new Error('connection not established');
    }
    const peerRole: SignalRole = match(role)
      .with('initiator', () => 'responder' as const)
      .with('responder', () => 'initiator' as const)
      .exhaustive();
    return this.transport.messages$.pipe(
      filter(
        (message): message is SealedMessage =>
          message.type === 'sealed' && message.kind === kind
      ),
      take(1),
      switchMap((message) =>
        from(
          open(
            key,
            decodeBase64Url(message.ct) as Uint8Array<ArrayBuffer>,
            roomId,
            peerRole
          )
        )
      ),
      map((bytes) => parse(decoder.decode(bytes)))
    );
  }

  close(): void {
    this.close$.next();
    this.transport.close();
    this.signalingKey = null;
    this.roomId = null;
    this.role = null;
  }

  disconnect(): void {
    const { signalingKey, roomId, role } = this;
    if (!signalingKey || !roomId || !role) {
      this.close();
      return;
    }
    this.sendSealed('disconnect', {
      cancelledBy: match(role)
        .with('initiator', () => 'sender' as const)
        .with('responder', () => 'receiver' as const)
        .exhaustive()
    })
      .pipe(
        catchError(() => EMPTY),
        finalize(() => this.close())
      )
      .subscribe();
  }

  sendFileHash(digest: string): void {
    const { signalingKey, roomId, role } = this;
    if (!signalingKey || !roomId || !role) return;
    this.sendSealed('file-hash', { digest })
      .pipe(catchError(() => EMPTY))
      .subscribe();
  }

  private receiveSealedStream<T>(
    kind: SealedKind,
    parse: (json: string) => T
  ): Observable<T> {
    return this.transport.messages$.pipe(
      filter(
        (message): message is SealedMessage =>
          message.type === 'sealed' && message.kind === kind
      ),
      switchMap((message) => this.openSealed(message, parse))
    );
  }

  private openSealed<T>(
    message: SealedMessage,
    parse: (json: string) => T
  ): Observable<T> {
    const { signalingKey, roomId, role } = this;
    if (!signalingKey || !roomId || !role) return EMPTY;
    const peerRole: SignalRole = match(role)
      .with('initiator', () => 'responder' as const)
      .with('responder', () => 'initiator' as const)
      .exhaustive();
    return from(
      open(
        signalingKey,
        decodeBase64Url(message.ct) as Uint8Array<ArrayBuffer>,
        roomId,
        peerRole
      )
    ).pipe(
      map((bytes) => parse(decoder.decode(bytes))),
      catchError(() => EMPTY)
    );
  }

  private exchangeAsInitiator(
    identity: Identity,
    file: FileMetadata
  ): Observable<Identity> {
    return combineLatest([
      this.sendSealed('peer-info', identity),
      this.sendSealed('file', file)
    ]).pipe(switchMap(() => this.receiveSealed('peer-info', parseIdentity)));
  }

  private exchangeAsResponder(
    identity: Identity
  ): Observable<{ peerIdentity: Identity; fileInfo: FileMetadata | null }> {
    const sendIdentity$ = this.sendSealed('peer-info', identity);
    return combineLatest([
      this.receiveSealed('peer-info', parseIdentity),
      this.receiveSealed('file', parseFileMetadata)
    ]).pipe(
      switchMap(([peerIdentity, fileInfo]) =>
        sendIdentity$.pipe(map(() => ({ peerIdentity, fileInfo })))
      )
    );
  }
}
