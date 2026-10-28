import { computed, effect, inject, type Signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Store } from '@ngrx/store';
import { type Observable, throttleTime } from 'rxjs';
import * as Match from 'effect/Match';
import type { FileMetadata } from '@contract/signal/file-metadata.model';
import type { Identity } from '@contract/signal/identity.model';
import type { TransferSnapshot } from '../../interfaces/transfer.interface';
import type { ProgressTransfer } from './progress-transfer/progress-transfer.component';
import { TransferMetricsStore } from './transfer-metrics.store';

const SAMPLE_INTERVAL_MS = 1000;

const EMPTY_SNAPSHOT: TransferSnapshot = {
  transferred: 0,
  total: 0,
  route: undefined,
  verified: false
};

export abstract class TransferComponent {
  protected readonly store = inject(Store);
  private readonly metrics = inject(TransferMetricsStore);

  private readonly liveTransfer: Signal<TransferSnapshot>;
  private readonly sampledTransfer: Signal<TransferSnapshot>;
  private readonly file: Signal<FileMetadata | undefined>;
  private readonly peer: Signal<Identity | undefined>;
  private readonly verifying: Signal<boolean>;
  protected readonly progress: Signal<ProgressTransfer>;

  constructor(
    transfer$: Observable<TransferSnapshot>,
    file$: Observable<FileMetadata | undefined>,
    peer$: Observable<Identity | undefined>,
    verifying$: Observable<boolean>
  ) {
    this.liveTransfer = toSignal(transfer$, { initialValue: EMPTY_SNAPSHOT });
    this.sampledTransfer = toSignal(
      transfer$.pipe(
        throttleTime(SAMPLE_INTERVAL_MS, undefined, {
          leading: true,
          trailing: true
        })
      ),
      { initialValue: EMPTY_SNAPSHOT }
    );
    this.file = toSignal(file$, { initialValue: undefined });
    this.peer = toSignal(peer$, { initialValue: undefined });
    this.verifying = toSignal(verifying$, { initialValue: false });

    effect(() => this.metrics.sample(this.sampledTransfer().transferred));

    this.progress = computed(() => {
      const live = this.liveTransfer();
      const sampled = this.sampledTransfer();
      const file = this.file();
      const peer = this.peer();
      const speed = this.metrics.speed();
      const percent = Match.value(live).pipe(
        Match.when({ verified: true }, () => 100),
        Match.when({ total: 0 }, () => 0),
        Match.orElse(({ total, transferred }) =>
          Math.min(99, Math.round((transferred / total) * 100))
        )
      );
      const remaining = sampled.total - sampled.transferred;
      const timeLeft = speed > 0 ? remaining / speed : undefined;

      return {
        fileName: file?.name ?? '',
        peerBrowser: peer?.browser ?? '',
        peerOs: peer?.os ?? '',
        percent,
        sent: sampled.transferred,
        total: sampled.total,
        speed,
        timeLeft,
        route: sampled.route ?? 'direct',
        verifying: this.verifying()
      };
    });
  }

  protected abstract cancel(): void;
}
