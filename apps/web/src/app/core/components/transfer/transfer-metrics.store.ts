import { untracked } from '@angular/core';
import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';

interface TransferMetricsState {
  lastBytes: number;
  lastAt: number;
  speed: number;
}

const initialMetrics: TransferMetricsState = {
  lastBytes: 0,
  lastAt: 0,
  speed: 0
};

export const TransferMetricsStore = signalStore(
  withState(initialMetrics),
  withMethods((store) => ({
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
