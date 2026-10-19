import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { toast } from '@spartan-ng/brain/sonner';
import {
  catchError,
  distinctUntilChanged,
  filter,
  map,
  of,
  skip,
  switchMap,
  tap
} from 'rxjs';
import { routeForPhase } from '../../features/receive/receive-phase/receive-phase';
import { ConnectionService } from '../../shared/services/connection.service';
import { IdentityService } from '../../shared/services/identity.service';
import { toErrorMessage } from '../../shared/utilities/error-message';
import {
  receiveCodeEntered,
  receiveDigestReceived,
  receiveDisconnect,
  receiveHandshakeFailed,
  receiveReset,
  receiveSasComputed
} from '../actions/receive.actions';
import { selectReceivePhase } from '../selectors/receive.selectors';

@Injectable()
export class ReceiveEffects {
  private readonly store = inject(Store);
  private readonly router = inject(Router);
  private readonly identityService = inject(IdentityService);
  private readonly connection = inject(ConnectionService);
  private readonly actions$ = inject(Actions);

  readonly routeToPhase$ = createEffect(
    () =>
      this.store.select(selectReceivePhase).pipe(
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

  readonly connect$ = createEffect(() =>
    this.actions$.pipe(
      ofType(receiveCodeEntered),
      switchMap(({ code }) =>
        this.connection
          .connectAsResponder(code, this.identityService.detect())
          .pipe(
            map(({ sas, peerIdentity, fileInfo }) =>
              receiveSasComputed({ sas, peerIdentity, file: fileInfo })
            ),
            catchError((error) =>
              of(
                receiveHandshakeFailed({
                  error: toErrorMessage(error, 'Handshake failed')
                })
              )
            )
          )
      )
    )
  );

  readonly closeRoom$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(receiveReset),
        tap(() => this.connection.close())
      ),
    { dispatch: false }
  );

  readonly disconnect$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(receiveDisconnect),
        tap(() => this.connection.disconnect())
      ),
    { dispatch: false }
  );

  readonly peerDisconnected$ = createEffect(() =>
    this.connection.peerDisconnected$.pipe(
      filter((notice) => notice.cancelledBy === 'sender'),
      tap(() => toast.warning('The sender canceled the transfer.')),
      map(() => receiveReset())
    )
  );

  readonly fileHash$ = createEffect(() =>
    this.connection.peerFileHash$.pipe(
      map((digest) => receiveDigestReceived({ digest }))
    )
  );
}
