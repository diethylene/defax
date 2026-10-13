import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { createEffect } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { distinctUntilChanged, skip, tap } from 'rxjs';
import { routeForPhase } from '../../features/send/send-phase';
import { selectSendPhase } from '../selectors/send.selectors';

@Injectable()
export class SendEffects {
  private readonly store = inject(Store);
  private readonly router = inject(Router);

  readonly routeToPhase$ = createEffect(
    () =>
      this.store.select(selectSendPhase).pipe(
        distinctUntilChanged(),
        skip(1),
        tap((phase) => {
          const url = routeForPhase(phase);
          if (this.router.url !== url) {
            void this.router.navigateByUrl(url);
          }
        })
      ),
    { dispatch: false }
  );
}
