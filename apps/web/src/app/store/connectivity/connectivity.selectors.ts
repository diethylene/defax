import { createSelector } from '@ngrx/store';
import type { TransferRoute } from '@web/core/interfaces/transfer.interface';
import { pipe } from 'effect/Function';
import * as Option from 'effect/Option';
import { connectivityFeature } from './connectivity.reducer';
import type { ConnectivityStatus } from './connectivity-status.type';

/** Status shown for each live transfer route. */
export const statusForRoute = {
  direct: { _tag: 'Direct' },
  relay: { _tag: 'Relay' },
} as const satisfies Record<TransferRoute, ConnectivityStatus>;

/** Status of the connectivity slice: the live route when set, else the readiness. */
export const selectStatus = createSelector(
  connectivityFeature.selectReadiness,
  connectivityFeature.selectLiveRoute,
  (readiness, liveRoute): ConnectivityStatus =>
    pipe(
      Option.fromUndefinedOr(liveRoute),
      Option.map((route) => statusForRoute[route]),
      Option.getOrElse((): ConnectivityStatus => readiness),
    ),
);
