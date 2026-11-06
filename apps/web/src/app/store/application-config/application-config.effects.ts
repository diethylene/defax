import { inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { tap, withLatestFrom } from 'rxjs';
import { applyMode, persistMode, transitionMode } from '../../core/utils/theme-preference.util';
import { ApplicationConfigActions } from './application-config.actions';
import { applicationConfigFeature } from './application-config.reducer';

/** Applies to the document the mode a set action leaves in the store. */
export const applyThemeMode$ = createEffect(
  (actions$ = inject(Actions), store = inject(Store)) =>
    actions$.pipe(
      ofType(ApplicationConfigActions.setMode),
      withLatestFrom(store.select(applicationConfigFeature.selectMode)),
      tap(([, mode]) => applyMode(mode)),
    ),
  { functional: true, dispatch: false },
);

/** Wipes the document to the mode a toggle leaves in the store. */
export const transitionThemeMode$ = createEffect(
  (actions$ = inject(Actions), store = inject(Store)) =>
    actions$.pipe(
      ofType(ApplicationConfigActions.toggleMode),
      withLatestFrom(store.select(applicationConfigFeature.selectMode)),
      tap(([, mode]) => transitionMode(mode)),
    ),
  { functional: true, dispatch: false },
);

/** Persists the mode a toggle leaves in the store. */
export const persistThemeMode$ = createEffect(
  (actions$ = inject(Actions), store = inject(Store)) =>
    actions$.pipe(
      ofType(ApplicationConfigActions.toggleMode),
      withLatestFrom(store.select(applicationConfigFeature.selectMode)),
      tap(([, mode]) => persistMode(mode)),
    ),
  { functional: true, dispatch: false },
);
