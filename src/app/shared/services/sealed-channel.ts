import { utf8ToBytes } from '@noble/hashes/utils.js';
import {
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
import type { RoomId } from '../interfaces/signal-session';
import type { SignalTransport } from '../interfaces/signal-transport';
import { open, type SignalRole, seal } from '../utilities/aead';
import { decodeBase64Url, encodeBase64Url } from '../utilities/base64url';

export type SealedKind = 'peer-info' | 'file';

type SealedMessage = Extract<SignalMessage, { type: 'sealed' }>;

const decoder = new TextDecoder();

export class SealedChannel {
  constructor(
    private readonly transport: SignalTransport,
    private readonly key: CryptoKey,
    private readonly roomId: RoomId,
    readonly role: SignalRole
  ) {}

  send(kind: SealedKind, payload: unknown): Observable<void> {
    return defer(() =>
      from(
        seal(
          this.key,
          utf8ToBytes(JSON.stringify(payload)),
          this.roomId,
          this.role
        )
      ).pipe(
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

  receive<T>(kind: SealedKind, parse: (json: string) => T): Observable<T> {
    const peerRole: SignalRole =
      this.role === 'initiator' ? 'responder' : 'initiator';
    return this.transport.messages$.pipe(
      filter(
        (message): message is SealedMessage =>
          message.type === 'sealed' && message.kind === kind
      ),
      take(1),
      switchMap((message) =>
        from(
          open(
            this.key,
            decodeBase64Url(message.ct) as Uint8Array<ArrayBuffer>,
            this.roomId,
            peerRole
          )
        )
      ),
      map((bytes) => parse(decoder.decode(bytes)))
    );
  }
}
