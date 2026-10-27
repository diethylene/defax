import { Injectable, inject } from '@angular/core';
import {
  catchError,
  concat,
  concatMap,
  defer,
  EMPTY,
  finalize,
  from,
  ignoreElements,
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
import * as Match from 'effect/Match';
import { TRANSFER_CHUNK_SIZE } from '../../shared/constants/transfer-protocol';
import type { FileMetadata } from '@contract/signal/file-metadata.model';
import {
  parseAccept,
  parseVerifyResult
} from '../../shared/utilities/transfer-message';
import { HashService } from './hash.service';
import { SignalingService } from './signaling.service';
import { StorageService } from './storage.service';
import { type RtcChannel, WebRtcService } from './webrtc.service';

/** Progress and outcome of one file transfer. */
export type TransferEvent =
  /** Transfer began, carrying the total byte count. */
  | { readonly type: 'started'; readonly total: number }
  /** Bytes moved so far. */
  | { readonly type: 'progress'; readonly transferred: number }
  /** Every byte has been sent or received. */
  | { readonly type: 'complete' }
  /** The receiver confirmed the file digest. */
  | { readonly type: 'verified' }
  /** The transfer stopped, carrying the reason. */
  | { readonly type: 'failed'; readonly error: string };

/** Everything needed to receive one file. */
export interface ReceiveRequest {
  /** Metadata the sender announced. */
  readonly metadata: FileMetadata;
  /** Digest the sender announced, used to verify the file. */
  readonly digest: string;
}

/** Moves file bytes over a WebRTC data channel. */
@Injectable({ providedIn: 'root' })
export class TransferService {
  /** Signaling channel carrying the sealed transfer messages. */
  private readonly signaling = inject(SignalingService);
  /** Opens the data channel the bytes travel over. */
  private readonly webrtc = inject(WebRtcService);
  /** Stores received chunks until they are assembled. */
  private readonly storage = inject(StorageService);
  /** Hashes the assembled file to verify it. */
  private readonly hash = inject(HashService);

  /**
   * Sends one file once the receiver accepts.
   * @param file File to send.
   * @returns Observable of transfer events.
   */
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

  /**
   * Receives one file once there is room for it.
   * @param input Metadata and digest the sender announced.
   * @returns Observable of transfer events.
   */
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

  /**
   * Opens the sender channel and pushes the file through it.
   * @param file File to send.
   * @returns Observable of transfer events.
   */
  private streamOut(file: File): Observable<TransferEvent> {
    return this.webrtc
      .openInitiator()
      .pipe(
        switchMap((channel) =>
          concat(
            this.sendChunks(file, channel),
            channel.drain().pipe(ignoreElements()),
            of<TransferEvent>({ type: 'complete' }).pipe(
              tap(() => channel.close())
            ),
            this.awaitVerification()
          ).pipe(finalize(() => channel.close()))
        )
      );
  }

  /**
   * Sends the file in chunks, reporting the running total.
   * @param file File to send.
   * @param channel Open data channel.
   * @returns Observable of progress events.
   */
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

  /**
   * Waits for the receiver's verdict on the file digest.
   * @returns Observable of verified or failed events.
   */
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

  /**
   * Accepts the offer, opens the receiver channel and stores the chunks.
   * @param input Metadata and digest the sender announced.
   * @returns Observable of transfer events.
   */
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

  /**
   * Stores incoming chunks, reporting the running total.
   * @param channel Open data channel.
   * @returns Observable of progress events.
   */
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

  /**
   * Assembles the stored chunks and verifies the result.
   * @param input Metadata and digest the sender announced.
   * @returns Observable of complete, verified or failed events.
   */
  private verifyAndFinish(input: ReceiveRequest): Observable<TransferEvent> {
    return concat(
      of<TransferEvent>({ type: 'complete' }),
      this.storage
        .assemble(input.metadata.mime)
        .pipe(switchMap((blob) => this.hashAndCompare(blob, input)))
    );
  }

  /**
   * Hashes the assembled file and compares it with the announced digest.
   * @param blob Assembled file contents.
   * @param input Metadata and digest the sender announced.
   * @returns Observable of verified or failed events.
   */
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
        Match.value(event).pipe(
          Match.discriminator('type')('complete', (e) => e.digest),
          Match.orElse(() => {
            throw new Error('hash did not complete');
          })
        )
      ),
      switchMap((digest) => this.finishAfterVerify(digest, input, blob))
    );
  }

  /**
   * Downloads the file when it matches and tells the sender the verdict.
   * @param digest Digest computed from the assembled file.
   * @param input Metadata and digest the sender announced.
   * @param blob Assembled file contents.
   * @returns Observable of the verified or failed event.
   */
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

  /** Tells the sender the file was accepted, dropping failures. */
  private sendAccept(): void {
    this.signaling
      .sendSealed('accept', {})
      .pipe(catchError(() => EMPTY))
      .subscribe();
  }

  /**
   * Sends the verification verdict to the sender, dropping failures.
   * @param ok Whether the assembled file matched the announced digest.
   */
  private sendVerifyResult(ok: boolean): void {
    this.signaling
      .sendSealed('verify-result', { ok })
      .pipe(catchError(() => EMPTY))
      .subscribe();
  }
}

/**
 * Tells whether the origin has room for the incoming file.
 * @param estimate Storage estimate for the origin.
 * @param size Bytes the file will occupy.
 * @returns True when the free quota covers the file.
 */
const hasRoomFor = (estimate: StorageEstimate, size: number): boolean => {
  const available =
    (estimate.quota ?? Number.POSITIVE_INFINITY) - (estimate.usage ?? 0);
  return size <= available;
};
