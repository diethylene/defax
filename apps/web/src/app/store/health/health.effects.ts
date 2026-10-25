import { inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { HealthApiService } from '@web/core/api/health-api.service';
import * as Result from 'effect/Result';
import { map, switchMap } from 'rxjs';
import { HealthActions } from './health.actions';

/** Checks API health whenever a check is requested; a newer request cancels the older one. */
export const checkHealth$ = createEffect(
  (actions$ = inject(Actions), api = inject(HealthApiService)) =>
    actions$.pipe(
      ofType(HealthActions.checkRequested),
      switchMap(() =>
        api.getHealth().pipe(
          map(
            Result.match({
              onSuccess: (health) => HealthActions.checkSucceeded({ health }),
              onFailure: () => HealthActions.checkFailed(),
            }),
          ),
        ),
      ),
    ),
  { functional: true },
);
