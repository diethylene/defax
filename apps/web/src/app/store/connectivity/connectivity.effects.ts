import { inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { filter, fromEvent, map, merge, switchMap } from 'rxjs';
import { ConnectivityProbeService } from '../../core/services/connectivity-probe.service';
import { ReceiveActions } from '../receive/receive.actions';
import { SendActions } from '../send/send.actions';
import { ConnectivityActions } from './connectivity.actions';

/** Runs the network probe whenever a check is requested. */
export const startCheck$ = createEffect(
  (actions$ = inject(Actions), probe = inject(ConnectivityProbeService)) =>
    actions$.pipe(
      ofType(ConnectivityActions.check),
      switchMap(() =>
        probe.check().pipe(map((readiness) => ConnectivityActions.checkSucceeded({ readiness }))),
      ),
    ),
  { functional: true },
);

/** Requests a check when the browser reconnects or the tab becomes visible. */
export const recheck$ = createEffect(
  () =>
    merge(
      fromEvent(window, 'online'),
      fromEvent(document, 'visibilitychange').pipe(
        filter(() => document.visibilityState === 'visible'),
      ),
    ).pipe(map(() => ConnectivityActions.check())),
  { functional: true },
);

/** Tracks the route of the active transfer and clears it when the transfer ends. */
export const liveRoute$ = createEffect(
  (actions$ = inject(Actions)) =>
    merge(
      actions$.pipe(
        ofType(SendActions.transferRouted, ReceiveActions.transferRouted),
        map(({ route }) => ConnectivityActions.routeChanged({ route })),
      ),
      actions$.pipe(
        ofType(
          SendActions.transferComplete,
          SendActions.transferFailed,
          SendActions.reset,
          SendActions.disconnect,
          ReceiveActions.transferComplete,
          ReceiveActions.transferFailed,
          ReceiveActions.reset,
          ReceiveActions.disconnect,
        ),
        map(() => ConnectivityActions.routeCleared()),
      ),
    ),
  { functional: true },
);
