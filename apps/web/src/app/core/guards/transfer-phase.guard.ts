import { inject } from '@angular/core';
import { type CanActivateFn, type CanDeactivateFn, Router } from '@angular/router';
import { type Action, type Selector, Store } from '@ngrx/store';

/** Warns the user that leaving cancels the transfer. */
const cancelMessage = 'Leaving cancels the transfer and returns you to the start.';

/** Everything one transfer slice gives its guards. */
export interface PhaseRouteGuardConfig<TStatus, TPhase extends string> {
  /** Reads the current transfer status from the store. */
  readonly selectStatus: Selector<object, TStatus>;
  /** Maps a status to the page that shows it. */
  readonly phaseForStatus: (status: TStatus) => TPhase;
  /** Reads the route that shows a page. */
  readonly routeForPhase: (phase: TPhase) => string;
  /** Creates the action that cancels the transfer. */
  readonly disconnect: () => Action;
  /** Tells whether leaving a status loses nothing. */
  readonly isSafeToLeave: (status: TStatus) => boolean;
}

/** Activate and deactivate guards for one transfer slice. */
interface PhaseRouteGuards {
  /** Keeps a route on the page its status owns. */
  readonly canActivate: CanActivateFn;
  /** Confirms before leaving a transfer that is still running. */
  readonly canDeactivate: CanDeactivateFn<unknown>;
}

/**
 * Builds the activate and deactivate guards for one transfer slice.
 * @param config Slice-specific status, phase, route and cancel wiring.
 * @returns The guard pair the route table registers.
 */
export const createPhaseRouteGuard = <TStatus, TPhase extends string>(
  config: PhaseRouteGuardConfig<TStatus, TPhase>,
): PhaseRouteGuards => ({
  canActivate: (_route, state) => {
    const store = inject(Store);
    const router = inject(Router);
    const status = store.selectSignal(config.selectStatus)();
    const expected = config.routeForPhase(config.phaseForStatus(status));
    return state.url === expected ? true : router.parseUrl(expected);
  },
  canDeactivate: (_component, _route, _state, nextState) => {
    const store = inject(Store);
    const status = store.selectSignal(config.selectStatus)();
    const expected = config.routeForPhase(config.phaseForStatus(status));
    const canLeave = nextState.url === expected || config.isSafeToLeave(status);
    const confirmedLeave = !canLeave && window.confirm(cancelMessage);
    if (confirmedLeave) {
      store.dispatch(config.disconnect());
    }
    return canLeave;
  },
});
