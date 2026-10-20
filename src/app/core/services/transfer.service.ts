import { Injectable, inject } from '@angular/core';
import {
  catchError,
  concat,
  concatMap,
  defer,
  EMPTY,
  finalize,
  from,
  last,
  map,
  type Observable,
  of,
  range,
  scan,
  switchMap,
  take,
  tap
} from 'rxjs';
import { match } from 'ts-pattern';
import { TRANSFER_CHUNK_SIZE } from '../../shared/constants/transfer-protocol';
import type { FileMetadata } from '../../shared/interfaces/file-metadata';
import {
  parseAccept,
  parseVerifyResult
} from '../../shared/validators/transfer-message';
import { HashService } from './hash.service';
import { SignalingService } from './signaling.service';
import { StorageService } from './storage.service';
import { type RtcChannel, WebRtcService } from './webrtc.service';

export type TransferEvent =
  | { type: 'started'; total: number }
  | { type: 'progress'; transferred: number }
  | { type: 'complete' }
  | { type: 'verified' }
  | { type: 'failed'; error: string };

export interface ReceiveRequest {
  metadata: FileMetadata;
  digest: string;
}

@Injectable({ providedIn: 'root' })
export class TransferService {
  private readonly signaling = inject(SignalingService);
  private readonly webrtc = inject(WebRtcService);
  private readonly storage = inject(StorageService);
  private readonly hash = inject(HashService);

  send(file: File): Observable<TransferEvent> {
    return this.signaling.sealed$('accept', parseAccept).pipe(
      take(1),
      switchMap(() =>
        concat(
          of<TransferEvent>({ type: 'started', total: file.size }),
          this.streamOut(file)
        )
      )
    );
  }

  receive(input: ReceiveRequest): Observable<TransferEvent> {
    return this.storage.open().pipe(
      switchMap(() => this.storage.estimate()),
      switchMap((estimate) =>
        hasRoomFor(estimate, input.metadata.size)
          ? this.receiveIn(input)
          : of<TransferEvent>({
              type: 'failed',
              error: 'not enough storage space'
            })
      ),
      finalize(() => this.storage.close())
    );
  }

  private streamOut(file: File): Observable<TransferEvent> {
    return this.webrtc
      .openInitiator()
      .pipe(
        switchMap((channel) =>
          concat(
            this.sendChunks(file, channel),
            of<TransferEvent>({ type: 'complete' }).pipe(
              tap(() => channel.close())
            ),
            this.awaitVerification()
          ).pipe(finalize(() => channel.close()))
        )
      );
  }

  private sendChunks(
    file: File,
    channel: RtcChannel
  ): Observable<TransferEvent> {
    const chunkCount = Math.ceil(file.size / TRANSFER_CHUNK_SIZE);
    return range(chunkCount).pipe(
      concatMap((index) =>
        from(
          file
            .slice(
              index * TRANSFER_CHUNK_SIZE,
              (index + 1) * TRANSFER_CHUNK_SIZE
            )
            .arrayBuffer()
        )
      ),
      concatMap((bytes) =>
        channel.send(bytes).pipe(map(() => bytes.byteLength))
      ),
      scan((sent, byteLength) => sent + byteLength, 0),
      map((sent): TransferEvent => ({ type: 'progress', transferred: sent }))
    );
  }

  private awaitVerification(): Observable<TransferEvent> {
    return this.signaling
      .receiveSealed('verify-result', parseVerifyResult)
      .pipe(
        map(
          (result): TransferEvent =>
            result.ok
              ? { type: 'verified' }
              : { type: 'failed', error: 'receiver verification failed' }
        )
      );
  }

  private receiveIn(input: ReceiveRequest): Observable<TransferEvent> {
    return defer(() => {
      this.sendAccept();
      return this.webrtc.openResponder().pipe(
        switchMap((channel) =>
          concat(
            of<TransferEvent>({
              type: 'started',
              total: input.metadata.size
            }),
            this.receiveChunks(channel),
            this.verifyAndFinish(input)
          ).pipe(finalize(() => channel.close()))
        )
      );
    });
  }

  private receiveChunks(channel: RtcChannel): Observable<TransferEvent> {
    return channel.messages$.pipe(
      concatMap((chunk) =>
        this.storage.storeChunk(chunk).pipe(map(() => chunk.byteLength))
      ),
      scan((received, byteLength) => received + byteLength, 0),
      map(
        (received): TransferEvent => ({
          type: 'progress',
          transferred: received
        })
      )
    );
  }

  private verifyAndFinish(input: ReceiveRequest): Observable<TransferEvent> {
    return concat(
      of<TransferEvent>({ type: 'complete' }),
      this.storage
        .assemble(input.metadata.mime)
        .pipe(switchMap((blob) => this.hashAndCompare(blob, input)))
    );
  }

  private hashAndCompare(
    blob: Blob,
    input: ReceiveRequest
  ): Observable<TransferEvent> {
    const file = new File([blob], input.metadata.name, {
      type: input.metadata.mime,
      lastModified: input.metadata.lastModified
    });
    return this.hash.hashFile(file).pipe(
      last(),
      map((event) =>
        match(event)
          .with({ type: 'complete' }, (e) => e.digest)
          .otherwise(() => {
            throw new Error('hash did not complete');
          })
      ),
      switchMap((digest) => this.finishAfterVerify(digest, input, blob))
    );
  }

  private finishAfterVerify(
    digest: string,
    input: ReceiveRequest,
    blob: Blob
  ): Observable<TransferEvent> {
    const ok = digest === input.digest;
    if (ok) {
      this.storage.download(blob, input.metadata.name);
    }
    this.sendVerifyResult(ok);
    return of<TransferEvent>(
      ok
        ? { type: 'verified' }
        : { type: 'failed', error: 'file verification failed' }
    );
  }

  private sendAccept(): void {
    this.signaling
      .sendSealed('accept', {})
      .pipe(catchError(() => EMPTY))
      .subscribe();
  }

  private sendVerifyResult(ok: boolean): void {
    this.signaling
      .sendSealed('verify-result', { ok })
      .pipe(catchError(() => EMPTY))
      .subscribe();
  }
}

function hasRoomFor(estimate: StorageEstimate, size: number): boolean {
  const available =
    (estimate.quota ?? Number.POSITIVE_INFINITY) - (estimate.usage ?? 0);
  return size <= available;
}
