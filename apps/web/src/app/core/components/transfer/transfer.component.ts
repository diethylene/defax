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

/** Interval at which the transferred byte count is sampled for the speed. */
const SAMPLE_INTERVAL_MS = 1000;

/** Snapshot shown before a transfer reports its first byte. */
const EMPTY_SNAPSHOT: TransferSnapshot = {
  transferred: 0,
  total: 0,
  route: undefined,
  verified: false
};

/** Base for the transfer screens; turns transfer streams into progress values. */
export abstract class TransferComponent {
  /** Global store, used by subclasses to cancel the transfer. */
  protected readonly store = inject(Store);
  /** Speed sampler shared by the progress view. */
  private readonly metrics = inject(TransferMetricsStore);

  /** Latest transfer snapshot. */
  private readonly liveTransfer: Signal<TransferSnapshot>;
  /** Snapshot sampled at a steady interval for the speed and time left. */
  private readonly sampledTransfer: Signal<TransferSnapshot>;
  /** File being moved, or undefined before metadata arrives. */
  private readonly file: Signal<FileMetadata | undefined>;
  /** Peer receiving or sending the file, or undefined before the handshake. */
  private readonly peer: Signal<Identity | undefined>;
  /** Whether the arrived file is being verified. */
  private readonly verifying: Signal<boolean>;
  /** Values the progress view shows. */
  protected readonly progress: Signal<ProgressTransfer>;

  /**
   * Wires the transfer streams into the progress view.
   * @param transfer$ Transfer snapshots from the store.
   * @param file$ File being moved, or undefined when none is known.
   * @param peer$ Peer identity, or undefined when none is known.
   * @param verifying$ Whether the file is being verified.
   */
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

  /** Cancels the transfer. */
  protected abstract cancel(): void;
}
