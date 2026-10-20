import { computed, effect, inject, type Signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Store } from '@ngrx/store';
import { type Observable, throttleTime } from 'rxjs';
import type { FileMetadata } from '../../../shared/interfaces/file-metadata';
import type { Identity } from '../../../shared/interfaces/identity';
import type { TransferSnapshot } from '../../interfaces/transfer.interface';
import type { ProgressTransfer } from './progress-transfer/progress-transfer';
import { TransferMetricsStore } from './transfer-metrics.store';

const SAMPLE_INTERVAL_MS = 1000;

const EMPTY_SNAPSHOT: TransferSnapshot = {
  transferred: 0,
  total: 0,
  route: null
};

export abstract class TransferComponent {
  protected readonly store = inject(Store);
  private readonly metrics = inject(TransferMetricsStore);

  private readonly liveTransfer: Signal<TransferSnapshot>;
  private readonly sampledTransfer: Signal<TransferSnapshot>;
  private readonly file: Signal<FileMetadata | null>;
  private readonly peer: Signal<Identity | null>;
  protected readonly progress: Signal<ProgressTransfer>;

  constructor(
    transfer$: Observable<TransferSnapshot>,
    file$: Observable<FileMetadata | null>,
    peer$: Observable<Identity | null>
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
    this.file = toSignal(file$, { initialValue: null });
    this.peer = toSignal(peer$, { initialValue: null });

    effect(() => this.metrics.sample(this.sampledTransfer().transferred));

    this.progress = computed(() => {
      const live = this.liveTransfer();
      const sampled = this.sampledTransfer();
      const file = this.file();
      const peer = this.peer();
      const speed = this.metrics.speed();
      const percent =
        live.total > 0 ? Math.round((live.transferred / live.total) * 100) : 0;
      const remaining = sampled.total - sampled.transferred;
      const timeLeft = speed > 0 ? remaining / speed : null;

      return {
        fileName: file?.name ?? '',
        peerBrowser: peer?.browser ?? '',
        peerOs: peer?.os ?? '',
        percent,
        sent: sampled.transferred,
        total: sampled.total,
        speed,
        timeLeft,
        route: sampled.route ?? 'direct'
      };
    });
  }

  protected abstract cancel(): void;
}
