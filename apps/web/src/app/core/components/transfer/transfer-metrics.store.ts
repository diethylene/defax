import { untracked } from '@angular/core';
import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';

/** Last sample taken by the transfer speed meter. */
interface TransferMetricsState {
  /** Byte count at the last sample. */
  lastBytes: number;
  /** Clock reading at the last sample. */
  lastAt: number;
  /** Bytes per second at the last sample. */
  speed: number;
}

/** Metrics before the first sample. */
const initialMetrics: TransferMetricsState = {
  lastBytes: 0,
  lastAt: 0,
  speed: 0
};

/** Samples transferred bytes to estimate the transfer speed. */
export const TransferMetricsStore = signalStore(
  withState(initialMetrics),
  withMethods((store) => ({
    /**
     * Records a byte count and updates the speed.
     * @param transferred Bytes transferred so far.
     */
    sample(transferred: number): void {
      untracked(() => {
        const now = Date.now();
        const delta = transferred - store.lastBytes();
        const elapsed = store.lastAt() > 0 ? now - store.lastAt() : 0;
        patchState(store, {
          lastBytes: transferred,
          lastAt: now,
          speed: elapsed > 0 ? (delta / elapsed) * 1000 : 0
        });
      });
    }
  }))
);
