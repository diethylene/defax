import { createFeature, createReducer, on } from '@ngrx/store';
import type { TransferRoute } from '@web/core/interfaces/transfer.interface';
import { ConnectivityActions } from './connectivity.actions';
import type { Readiness } from './connectivity-status.type';

/** Connectivity slice of the global store. */
export interface ConnectivityState {
  /** Self-check state shown while no transfer is active. */
  readonly readiness: Readiness;
  /** Route of the active transfer, or undefined when there is none. */
  readonly liveRoute: TransferRoute | undefined;
}

/** Slice state before the first check completes. */
export const initialConnectivityState: ConnectivityState = {
  readiness: { _tag: 'Checking' },
  liveRoute: undefined,
};

/** The connectivity feature: reducer plus generated selectors. */
export const connectivityFeature = createFeature({
  name: 'connectivity',
  reducer: createReducer(
    initialConnectivityState,
    on(
      ConnectivityActions.check,
      (state): ConnectivityState => ({ ...state, readiness: { _tag: 'Checking' } }),
    ),
    on(
      ConnectivityActions.checkSucceeded,
      (state, { readiness }): ConnectivityState => ({ ...state, readiness }),
    ),
    on(
      ConnectivityActions.routeChanged,
      (state, { route }): ConnectivityState => ({ ...state, liveRoute: route }),
    ),
    on(
      ConnectivityActions.routeCleared,
      (state): ConnectivityState => ({ ...state, liveRoute: undefined }),
    ),
  ),
});
