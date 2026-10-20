import { Injectable, inject } from '@angular/core';
import {
  catchError,
  EMPTY,
  firstValueFrom,
  lastValueFrom,
  Observable,
  type Subscriber
} from 'rxjs';
import { match } from 'ts-pattern';
import type { SealedKind } from '../../shared/constants/signal-message';
import { TRANSFER_CHUNK_SIZE } from '../../shared/constants/transfer-protocol';
import type { FileMetadata } from '../../shared/interfaces/file-metadata';
import { toErrorMessage } from '../../shared/utilities/error-message';
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
    return new Observable<TransferEvent>((subscriber) => {
      let channel: RtcChannel | null = null;
      const accept = this.signaling.sealed$('accept', parseAccept).subscribe({
        next: () => {
          void this.streamOut(file, subscriber, (opened) => {
            channel = opened;
          }).catch((error) =>
            subscriber.error(toErrorMessage(error, 'Transfer failed'))
          );
        },
        error: (error) =>
          subscriber.error(toErrorMessage(error, 'Transfer failed'))
      });

      return () => {
        accept.unsubscribe();
        channel?.close();
      };
    });
  }

  receive(input: ReceiveRequest): Observable<TransferEvent> {
    return new Observable<TransferEvent>((subscriber) => {
      let channel: RtcChannel | null = null;
      void this.receiveIn(input, subscriber, (opened) => {
        channel = opened;
      }).catch((error) =>
        subscriber.error(toErrorMessage(error, 'Transfer failed'))
      );

      return () => {
        channel?.close();
        void this.storage.close();
      };
    });
  }

  private async streamOut(
    file: File,
    subscriber: Subscriber<TransferEvent>,
    onChannel: (channel: RtcChannel) => void
  ): Promise<void> {
    subscriber.next({ type: 'started', total: file.size });
    const channel = await this.webrtc.openInitiator();
    onChannel(channel);

    const chunkCount = Math.ceil(file.size / TRANSFER_CHUNK_SIZE);
    let sent = 0;
    for (let index = 0; index < chunkCount; index++) {
      const bytes = await file
        .slice(index * TRANSFER_CHUNK_SIZE, (index + 1) * TRANSFER_CHUNK_SIZE)
        .arrayBuffer();
      await channel.send(bytes);
      sent += bytes.byteLength;
      subscriber.next({ type: 'progress', transferred: sent });
    }

    channel.close();
    subscriber.next({ type: 'complete' });

    const result = await firstValueFrom(
      this.signaling.receiveSealed('verify-result', parseVerifyResult)
    );
    if (result.ok) {
      subscriber.next({ type: 'verified' });
    } else {
      subscriber.next({
        type: 'failed',
        error: 'receiver verification failed'
      });
    }
    subscriber.complete();
  }

  private async receiveIn(
    input: ReceiveRequest,
    subscriber: Subscriber<TransferEvent>,
    onChannel: (channel: RtcChannel) => void
  ): Promise<void> {
    const channelPromise = this.webrtc.openResponder();
    await this.storage.open();
    this.sendSignal('accept', {});
    const channel = await channelPromise;
    onChannel(channel);
    subscriber.next({ type: 'started', total: input.metadata.size });

    let received = 0;
    let index = 0;
    while (received < input.metadata.size) {
      const chunk = await channel.receive();
      await this.storage.storeChunk(index, chunk);
      index++;
      received += chunk.byteLength;
      subscriber.next({ type: 'progress', transferred: received });
    }
    subscriber.next({ type: 'complete' });

    const blob = await this.storage.assemble(input.metadata.mime);
    await this.storage.close();
    const file = new File([blob], input.metadata.name, {
      type: input.metadata.mime,
      lastModified: input.metadata.lastModified
    });
    const digest = match(await lastValueFrom(this.hash.hashFile(file)))
      .with({ type: 'complete' }, (event) => event.digest)
      .otherwise(() => {
        throw new Error('hash did not complete');
      });

    if (digest === input.digest) {
      this.storage.download(blob, input.metadata.name);
      this.sendSignal('verify-result', { ok: true });
      subscriber.next({ type: 'verified' });
    } else {
      this.sendSignal('verify-result', { ok: false });
      subscriber.next({ type: 'failed', error: 'file verification failed' });
    }
    subscriber.complete();
  }

  private sendSignal(kind: SealedKind, payload: unknown): void {
    this.signaling
      .sendSealed(kind, payload)
      .pipe(catchError(() => EMPTY))
      .subscribe();
  }
}
