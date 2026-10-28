import { Injectable, inject } from '@angular/core';
import type { FileMetadata } from '@contract/signal/file-metadata.model';
import type { Identity } from '@contract/signal/identity.model';
import type { DisconnectNotice } from '@contract/signal/payload.model';
import {
  DisconnectNotice as DisconnectNoticeSchema,
  FileHash,
} from '@contract/signal/payload.model';
import type { SealedKind } from '@contract/signal/sealed-kind.model';
import { utf8ToBytes } from '@noble/hashes/utils.js';
import * as Match from 'effect/Match';
import * as Schema from 'effect/Schema';
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
  tap,
} from 'rxjs';
import type { RoomId } from '../../shared/interfaces/signal-session';
import { SignalTransport } from '../../shared/interfaces/signal-transport';
import { open, type SignalRole, seal } from '../../shared/utilities/aead';
import { decodeBase64Url, encodeBase64Url } from '../../shared/utilities/base64url';
import { parseFileMetadata } from '../../shared/utilities/file-metadata';
import { parseIdentity } from '../../shared/utilities/identity';
import { generatePassword } from '../../shared/utilities/password';
import type { SignalMessage } from '../../shared/utilities/signal-message';
import { HandshakeService, type InitiatorSession } from './handshake.service';

/** Connection the initiator reports once the peer answers. */
export interface InitiatorConnection {
  /** Short authentication string both peers compare out of band. */
  sas: string;
  /** Details the responder sent about itself. */
  peerIdentity: Identity;
}

/** Connection the responder reports once the peer answers. */
export interface ResponderConnection {
  /** Short authentication string both peers compare out of band. */
  sas: string;
  /** Details the initiator sent about itself. */
  peerIdentity: Identity;
  /** Metadata of the file the initiator is sending. */
  fileInfo: FileMetadata | null;
}

/** Sealed message carrying one kind of signalling payload. */
type SealedMessage = Extract<SignalMessage, { type: 'sealed' }>;

/** Connection with no handshake completed. */
interface IdleConnection {
  /** Discriminant. */
  readonly _tag: 'idle';
}

/** Connection whose handshake produced the signalling key. */
interface EstablishedConnection {
  /** Discriminant. */
  readonly _tag: 'established';
  /** Key sealing and opening the signalling payloads. */
  readonly signalingKey: CryptoKey;
  /** Room both peers bind their payloads to. */
  readonly roomId: RoomId;
  /** Role this side plays in the pair. */
  readonly role: SignalRole;
}

/** Lifecycle state of the signalling connection. */
type Connection = IdleConnection | EstablishedConnection;

/** State before the handshake completes. */
const IDLE: Connection = { _tag: 'idle' };

/** Role the peer plays for each local role. */
const PEER_ROLE = {
  initiator: 'responder',
  responder: 'initiator',
} as const satisfies Record<SignalRole, SignalRole>;

/** Disconnect notice each role sends when it cancels. */
const CANCELLED_BY = {
  initiator: 'sender',
  responder: 'receiver',
} as const satisfies Record<SignalRole, DisconnectNotice['cancelledBy']>;

/** Decoder for the decrypted payloads. */
const decoder = new TextDecoder();

/**
 * Parses a disconnect notice received from the peer.
 * @param json Payload of the sealed disconnect message.
 * @returns The validated notice.
 */
const parseDisconnect = (json: string): DisconnectNotice =>
  Schema.decodeUnknownSync(Schema.fromJsonString(DisconnectNoticeSchema))(json);

/**
 * Parses a file digest received from the peer.
 * @param json Payload of the sealed file hash message.
 * @returns The validated digest.
 */
const parseFileHash = (json: string): string =>
  Schema.decodeUnknownSync(Schema.fromJsonString(FileHash))(json).digest;

/** Exchanges sealed signalling payloads over a transport. */
@Injectable({ providedIn: 'root' })
export class SignalingService {
  /** Transport carrying the raw signalling messages. */
  private readonly transport = inject(SignalTransport);
  /** Handshake producing the shared signalling key. */
  private readonly handshake = inject(HandshakeService);
  /** Emits when the connection closes. */
  private readonly close$ = new Subject<void>();
  /** Emits the disconnect notices received from the peer. */
  private readonly disconnect$ = new Subject<DisconnectNotice>();
  /** Emits the file digests received from the peer. */
  private readonly fileHash$ = new Subject<string>();
  /** Lifecycle state of the signalling connection. */
  private connection: Connection = IDLE;

  /** Notices that the peer cancelled the transfer. */
  readonly peerDisconnected$ = this.disconnect$.asObservable();
  /** Digests the peer computed for the file it is sending. */
  readonly peerFileHash$ = this.fileHash$.asObservable();

  /** Forwards the peer's disconnect notice and file digest. */
  constructor() {
    this.sealed$('disconnect', parseDisconnect).subscribe((notice) =>
      this.disconnect$.next(notice),
    );
    this.sealed$('file-hash', parseFileHash).subscribe((digest) => this.fileHash$.next(digest));
  }

  /**
   * Creates a room and the session the initiator will run in.
   * @returns The room id, session id, and generated password.
   */
  createSession(): InitiatorSession {
    const { roomId, sid } = this.transport.createRoom();
    return { roomId, sid, password: generatePassword() };
  }

  /**
   * Runs the handshake as the initiator and exchanges peer details.
   * @param session Session created by this side.
   * @param identity Details sent to the responder.
   * @param file Metadata of the file to send.
   * @returns Observable of the sas and the responder's details.
   */
  connectAsInitiator(
    session: InitiatorSession,
    identity: Identity,
    file: FileMetadata,
  ): Observable<InitiatorConnection> {
    return this.handshake.runAsInitiator(this.transport, session).pipe(
      switchMap(({ signalingKey, sas }) => {
        this.connection = {
          _tag: 'established',
          signalingKey,
          roomId: session.roomId,
          role: 'initiator',
        };
        return this.exchangeAsInitiator(identity, file).pipe(
          map((peerIdentity) => ({ sas, peerIdentity })),
        );
      }),
      takeUntil(this.close$),
    );
  }

  /**
   * Runs the handshake as the responder and exchanges peer details.
   * @param code Passcode carrying the room id and password.
   * @param identity Details sent to the initiator.
   * @returns Observable of the sas, the initiator's details, and the file.
   */
  connectAsResponder(code: string, identity: Identity): Observable<ResponderConnection> {
    return defer(() => this.handshake.runAsResponder(this.transport, code)).pipe(
      switchMap(({ signalingKey, sas, roomId }) => {
        this.connection = {
          _tag: 'established',
          signalingKey,
          roomId,
          role: 'responder',
        };
        return this.exchangeAsResponder(identity).pipe(
          map(({ peerIdentity, fileInfo }) => ({ sas, peerIdentity, fileInfo })),
        );
      }),
      takeUntil(this.close$),
    );
  }

  /**
   * Seals a payload with the connection keys and sends it.
   * @param kind Payload kind the peer filters on.
   * @param payload Value to seal.
   * @returns Observable completing once the message is sent.
   */
  sendSealed(kind: SealedKind, payload: unknown): Observable<void> {
    return Match.value(this.connection).pipe(
      Match.tag('established', ({ signalingKey, roomId, role }) =>
        defer(() =>
          from(seal(signalingKey, utf8ToBytes(JSON.stringify(payload)), roomId, role)).pipe(
            tap((ct) =>
              this.transport.send({
                type: 'sealed',
                kind,
                ct: encodeBase64Url(ct),
              }),
            ),
            map(() => undefined),
          ),
        ),
      ),
      Match.tag('idle', () => {
        throw new Error('connection not established');
      }),
      Match.exhaustive,
    );
  }

  /**
   * Waits for the peer's sealed payload of one kind and parses it.
   * @param kind Payload kind to wait for.
   * @param parse Parser for the decrypted payload.
   * @returns Observable of the parsed value.
   */
  receiveSealed<T>(kind: SealedKind, parse: (json: string) => T): Observable<T> {
    return Match.value(this.connection).pipe(
      Match.tag('established', (connection) =>
        this.sealedOfKind(kind).pipe(
          take(1),
          switchMap((message) => this.openPayload(connection, message, parse)),
        ),
      ),
      Match.tag('idle', () => {
        throw new Error('connection not established');
      }),
      Match.exhaustive,
    );
  }

  /** Closes the transport and returns the connection to idle. */
  close(): void {
    this.close$.next();
    this.transport.close();
    this.connection = IDLE;
  }

  /** Tells the peer this side cancelled, then closes the connection. */
  disconnect(): void {
    Match.value(this.connection).pipe(
      Match.tag('established', ({ role }) =>
        this.sendSealed('disconnect', { cancelledBy: CANCELLED_BY[role] })
          .pipe(
            catchError(() => EMPTY),
            finalize(() => this.close()),
          )
          .subscribe(),
      ),
      Match.tag('idle', () => this.close()),
      Match.exhaustive,
    );
  }

  /**
   * Sends the file digest to the peer.
   * @param digest Digest to send.
   */
  sendFileHash(digest: string): void {
    Match.value(this.connection).pipe(
      Match.tag('established', () =>
        this.sendSealed('file-hash', { digest })
          .pipe(catchError(() => EMPTY))
          .subscribe(),
      ),
      Match.tag('idle', () => undefined),
      Match.exhaustive,
    );
  }

  /**
   * Streams parsed payloads of one kind from the peer.
   * @param kind Payload kind to watch.
   * @param parse Parser for the decrypted payload.
   * @returns Observable of parsed values, skipping undecryptable messages.
   */
  sealed$<T>(kind: SealedKind, parse: (json: string) => T): Observable<T> {
    return this.sealedOfKind(kind).pipe(switchMap((message) => this.openSealed(message, parse)));
  }

  /**
   * Filters the transport stream to sealed messages of one kind.
   * @param kind Payload kind to keep.
   * @returns Observable of matching sealed messages.
   */
  private sealedOfKind(kind: SealedKind): Observable<SealedMessage> {
    return this.transport.messages$.pipe(
      filter(
        (message): message is SealedMessage => message.type === 'sealed' && message.kind === kind,
      ),
    );
  }

  /**
   * Opens one sealed message for the established connection.
   * @param connection Connection holding the key.
   * @param message Sealed message to open.
   * @param parse Parser for the decrypted payload.
   * @returns Observable of the parsed value, empty when it cannot be opened.
   */
  private openSealed<T>(message: SealedMessage, parse: (json: string) => T): Observable<T> {
    return Match.value(this.connection).pipe(
      Match.tag('established', (connection) =>
        this.openPayload(connection, message, parse).pipe(catchError(() => EMPTY)),
      ),
      Match.tag('idle', () => EMPTY),
      Match.exhaustive,
    );
  }

  /**
   * Decrypts a sealed message and parses its payload.
   * @param connection Connection holding the key.
   * @param message Sealed message to open.
   * @param parse Parser for the decrypted payload.
   * @returns Observable of the parsed value.
   */
  private openPayload<T>(
    connection: EstablishedConnection,
    message: SealedMessage,
    parse: (json: string) => T,
  ): Observable<T> {
    return from(
      open(
        connection.signalingKey,
        decodeBase64Url(message.ct) as Uint8Array<ArrayBuffer>,
        connection.roomId,
        PEER_ROLE[connection.role],
      ),
    ).pipe(map((bytes) => parse(decoder.decode(bytes))));
  }

  /**
   * Sends own details and the file metadata, then waits for the peer's.
   * @param identity Details sent to the responder.
   * @param file Metadata of the file to send.
   * @returns Observable of the responder's details.
   */
  private exchangeAsInitiator(identity: Identity, file: FileMetadata): Observable<Identity> {
    return combineLatest([
      this.sendSealed('peer-info', identity),
      this.sendSealed('file', file),
    ]).pipe(switchMap(() => this.receiveSealed('peer-info', parseIdentity)));
  }

  /**
   * Waits for the peer's details and file, then sends own details.
   * @param identity Details sent to the initiator.
   * @returns Observable of the initiator's details and the file metadata.
   */
  private exchangeAsResponder(
    identity: Identity,
  ): Observable<{ peerIdentity: Identity; fileInfo: FileMetadata | null }> {
    const sendIdentity$ = this.sendSealed('peer-info', identity);
    return combineLatest([
      this.receiveSealed('peer-info', parseIdentity),
      this.receiveSealed('file', parseFileMetadata),
    ]).pipe(
      switchMap(([peerIdentity, fileInfo]) =>
        sendIdentity$.pipe(map(() => ({ peerIdentity, fileInfo }))),
      ),
    );
  }
}
