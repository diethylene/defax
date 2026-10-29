import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { createEffect } from '@ngrx/effects';
import { type Selector, Store } from '@ngrx/store';
import { distinctUntilChanged, map, skip, tap } from 'rxjs';

/** Everything one transfer slice gives its route effect. */
export interface RouteToPhaseConfig<TStatus, TPhase extends string> {
  /** Reads the current transfer status from the store. */
  readonly selectStatus: Selector<object, TStatus>;
  /** Maps a status to the page that shows it. */
  readonly phaseForStatus: (status: TStatus) => TPhase;
  /** Reads the route that shows a page. */
  readonly routeForPhase: (phase: TPhase) => string;
}

/**
 * Builds the effect that follows status changes with navigation.
 * @param config Slice-specific status, phase and route wiring.
 * @returns Functional effect that navigates on phase changes without dispatching.
 */
export const createRouteToPhaseEffect = <TStatus, TPhase extends string>(
  config: RouteToPhaseConfig<TStatus, TPhase>,
) =>
  createEffect(
    (store = inject(Store), router = inject(Router)) =>
      store.select(config.selectStatus).pipe(
        map(config.phaseForStatus),
        distinctUntilChanged(),
        skip(1),
        tap((phase) => {
          const url = config.routeForPhase(phase);
          if (router.url !== url) {
            void router.navigateByUrl(url);
          }
        }),
      ),
    { functional: true, dispatch: false },
  );
