import { inject } from '@angular/core';
import {
  type CanActivateFn,
  type CanDeactivateFn,
  Router
} from '@angular/router';
import { Store } from '@ngrx/store';
import { routeForPhase } from '../../features/send/send-phase/send-phase';
import { sendDisconnect } from '../../store/actions/send.actions';
import { selectSendPhase } from '../../store/selectors/send.selectors';

const cancelMessage =
  'Leaving cancels the transfer and returns you to the start.';

export const sendCanActivate: CanActivateFn = (_route, state) => {
  const store = inject(Store);
  const router = inject(Router);
  const phase = store.selectSignal(selectSendPhase)();
  const expected = routeForPhase(phase);
  return state.url === expected ? true : router.parseUrl(expected);
};

export const sendCanDeactivate: CanDeactivateFn<unknown> = (
  _component,
  _route,
  _state,
  nextState
) => {
  const store = inject(Store);
  const phase = store.selectSignal(selectSendPhase)();
  if (nextState.url === routeForPhase(phase)) return true;
  if (phase === 'idle') return true;
  if (!window.confirm(cancelMessage)) return false;
  store.dispatch(sendDisconnect());
  return false;
};
