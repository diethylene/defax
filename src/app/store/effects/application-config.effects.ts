import { Injectable, inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { tap, withLatestFrom } from 'rxjs';
import { applyMode, persistMode } from '../../core/services/theme-preference';
import { setMode, toggleMode } from '../actions/application-config.actions';
import { selectMode } from '../selectors/application-config.selectors';

@Injectable()
export class ApplicationConfigEffects {
  private readonly actions$ = inject(Actions);
  private readonly store = inject(Store);

  readonly applyMode$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(setMode, toggleMode),
        withLatestFrom(this.store.select(selectMode)),
        tap(([, mode]) => applyMode(mode))
      ),
    { dispatch: false }
  );

  readonly persistMode$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(toggleMode),
        withLatestFrom(this.store.select(selectMode)),
        tap(([, mode]) => persistMode(mode))
      ),
    { dispatch: false }
  );
}
