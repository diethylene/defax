import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { createEffect } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import {
  catchError,
  concat,
  distinctUntilChanged,
  EMPTY,
  filter,
  map,
  of,
  skip,
  switchMap,
  tap,
  withLatestFrom
} from 'rxjs';
import { routeForPhase } from '../../features/send/send-phase';
import { HashService } from '../../shared/services/hash.service';
import {
  sendHashComplete,
  sendHashFailed,
  sendHashProgress,
  sendHashStarted
} from '../actions/send.actions';
import { selectSendFile, selectSendPhase } from '../selectors/send.selectors';

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'File hashing failed';
}

@Injectable()
export class SendEffects {
  private readonly store = inject(Store);
  private readonly router = inject(Router);
  private readonly hashService = inject(HashService);

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

  readonly hashFile$ = createEffect(() =>
    this.store.select(selectSendPhase).pipe(
      distinctUntilChanged(),
      filter((phase): phase is 'awaitingPeer' => phase === 'awaitingPeer'),
      withLatestFrom(this.store.select(selectSendFile)),
      switchMap(([, file]) => {
        if (!file) return EMPTY;
        return concat(
          of(sendHashStarted()),
          this.hashService.hashFile(file).pipe(
            map((event) =>
              event.type === 'progress'
                ? sendHashProgress({ processed: event.processed })
                : sendHashComplete({ digest: event.digest })
            ),
            catchError((error: unknown) =>
              of(sendHashFailed({ error: toErrorMessage(error) }))
            )
          )
        );
      })
    )
  );
}
