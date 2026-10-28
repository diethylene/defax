import { inject } from '@angular/core';
import {
  type CanActivateFn,
  type CanDeactivateFn,
  Router
} from '@angular/router';
import { Store } from '@ngrx/store';
import * as Match from 'effect/Match';
import { routeForPhase } from '../../features/send/send-phase/send-phase';
import { SendActions } from '../../store/send/send.actions';
import type { SendStatus } from '../../store/send/send-transitions';
import {
  phaseForStatus,
  selectSendStatus
} from '../../store/send/send.selectors';

const cancelMessage =
  'Leaving cancels the transfer and returns you to the start.';

export const sendCanActivate: CanActivateFn = (_route, state) => {
  const store = inject(Store);
  const router = inject(Router);
  const status = store.selectSignal(selectSendStatus)();
  const expected = routeForPhase(phaseForStatus[status._tag]);
  return state.url === expected ? true : router.parseUrl(expected);
};

export const sendCanDeactivate: CanDeactivateFn<unknown> = (
  _component,
  _route,
  _state,
  nextState
) => {
  const store = inject(Store);
  const status = store.selectSignal(selectSendStatus)();
  if (nextState.url === routeForPhase(phaseForStatus[status._tag])) return true;
  if (isSafeToLeave(status)) return true;
  if (!window.confirm(cancelMessage)) return false;
  store.dispatch(SendActions.disconnect());
  return false;
};

/**
 * Tells whether the send can be left without cancelling it.
 * @param status Current send status.
 * @returns True when nothing is in flight.
 */
const isSafeToLeave = (status: SendStatus): boolean =>
  Match.value(status).pipe(
    Match.tag('Idle', 'Done', 'Failed', () => true),
    Match.orElse(() => false)
  );
