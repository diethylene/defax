import { inject } from '@angular/core';
import {
  type CanActivateFn,
  type CanDeactivateFn,
  Router,
} from '@angular/router';
import { Store } from '@ngrx/store';
import { phaseForStatus, routeForPhase } from '@web/features/receive/receive-phase/receive-phase.model';
import { ReceiveActions } from '@web/store/receive/receive.actions';
import { receiveFeature } from '@web/store/receive/receive.reducer';
import type { ReceiveStatus } from '@web/store/receive/receive-transitions';
import * as Match from 'effect/Match';

/** Warns the user that leaving cancels the transfer. */
const cancelMessage = 'Leaving cancels the transfer and returns you to the start.';

/**
 * Tells whether leaving a status loses nothing.
 * @param status Current receive status.
 * @returns True when the receive is idle, done or failed.
 */
const isSafeToLeave = (status: ReceiveStatus): boolean =>
  Match.value(status).pipe(
    Match.when({ _tag: 'Idle' }, () => true),
    Match.when({ _tag: 'Done' }, () => true),
    Match.when({ _tag: 'Failed' }, () => true),
    Match.orElse(() => false),
  );

/** Keeps a receive route on the page its status owns. */
export const receiveCanActivate: CanActivateFn = (_route, state) => {
  const store = inject(Store);
  const router = inject(Router);
  const status = store.selectSignal(receiveFeature.selectStatus)();
  const expected = routeForPhase(phaseForStatus(status));
  return state.url === expected ? true : router.parseUrl(expected);
};

/** Confirms before leaving a receive that is still running. */
export const receiveCanDeactivate: CanDeactivateFn<unknown> = (
  _component,
  _route,
  _state,
  nextState,
) => {
  const store = inject(Store);
  const status = store.selectSignal(receiveFeature.selectStatus)();
  if (nextState.url === routeForPhase(phaseForStatus(status))) return true;
  if (isSafeToLeave(status)) return true;
  if (!window.confirm(cancelMessage)) return false;
  store.dispatch(ReceiveActions.disconnect());
  return false;
};
