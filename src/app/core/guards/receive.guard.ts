import { inject } from '@angular/core';
import {
  type CanActivateFn,
  type CanDeactivateFn,
  Router
} from '@angular/router';
import { Store } from '@ngrx/store';
import { routeForPhase } from '../../features/receive/receive-phase/receive-phase';
import { receiveReset } from '../../store/actions/receive.actions';
import { selectReceivePhase } from '../../store/selectors/receive.selectors';

const cancelMessage =
  'Leaving cancels the transfer and returns you to the start.';

export const receiveCanActivate: CanActivateFn = (_route, state) => {
  const store = inject(Store);
  const router = inject(Router);
  const phase = store.selectSignal(selectReceivePhase)();
  const expected = routeForPhase(phase);
  return state.url === expected ? true : router.parseUrl(expected);
};

export const receiveCanDeactivate: CanDeactivateFn<unknown> = (
  _component,
  _route,
  _state,
  nextState
) => {
  const store = inject(Store);
  const phase = store.selectSignal(selectReceivePhase)();
  if (nextState.url === routeForPhase(phase)) return true;
  if (phase === 'idle') return true;
  if (!window.confirm(cancelMessage)) return false;
  store.dispatch(receiveReset());
  return false;
};
