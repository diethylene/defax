import { inject } from '@angular/core';
import { type CanActivateFn, type CanDeactivateFn, Router } from '@angular/router';
import { Store } from '@ngrx/store';
import * as Match from 'effect/Match';
import { routeForPhase } from '../../features/send/send-phase/send-phase.model';
import { SendActions } from '../../store/send/send.actions';
import { phaseForStatus, selectSendStatus } from '../../store/send/send.selectors';
import type { SendStatus } from '../../store/send/send-transitions';

/** Warns the user that leaving cancels the transfer. */
const cancelMessage = 'Leaving cancels the transfer and returns you to the start.';

/**
 * Tells whether leaving a status loses nothing.
 * @param status Current send status.
 * @returns True when nothing is in flight.
 */
const isSafeToLeave = (status: SendStatus): boolean =>
  Match.value(status).pipe(
    Match.tag('Idle', 'Done', 'Failed', () => true),
    Match.orElse(() => false),
  );

/**
 * Tells whether a target URL needs no confirmation.
 * @param status Current send status.
 * @param url URL the router is heading to.
 * @returns True when the target is the status' own page or the status is safe.
 */
const canLeave = (status: SendStatus, url: string): boolean =>
  url === routeForPhase(phaseForStatus[status._tag]) || isSafeToLeave(status);

/**
 * Asks the user, and ends the send when they accept.
 * @param store Store holding the send slice.
 */
const cancelOnLeave = (store: Store): void => {
  if (!window.confirm(cancelMessage)) return;
  store.dispatch(SendActions.disconnect());
};

/** Keeps a send route on the page its status owns. */
export const sendCanActivate: CanActivateFn = (_route, state) => {
  const store = inject(Store);
  const router = inject(Router);
  const status = store.selectSignal(selectSendStatus)();
  const expected = routeForPhase(phaseForStatus[status._tag]);
  return state.url === expected ? true : router.parseUrl(expected);
};

/** Confirms before leaving a send that is still running. */
export const sendCanDeactivate: CanDeactivateFn<unknown> = (
  _component,
  _route,
  _state,
  nextState,
) => {
  const store = inject(Store);
  const status = store.selectSignal(selectSendStatus)();
  if (canLeave(status, nextState.url)) return true;
  cancelOnLeave(store);
  return false;
};
