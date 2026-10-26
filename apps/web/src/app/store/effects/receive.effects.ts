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
  takeUntil,
  tap,
  withLatestFrom
} from 'rxjs';
import { match } from 'ts-pattern';
import { SignalingService } from '../../core/services/signaling.service';
import { TransferService } from '../../core/services/transfer.service';
import { routeForPhase } from '../../features/receive/receive-phase/receive-phase';
import { IdentityService } from '../../shared/services/identity.service';
import { toErrorMessage } from '../../shared/utilities/error-message';
import {
  receiveAccepted,
  receiveCodeEntered,
  receiveDigestReceived,
  receiveDisconnect,
  receiveHandshakeFailed,
  receiveReset,
  receiveSasComputed,
  receiveTransferComplete,
  receiveTransferFailed,
  receiveTransferProgress,
  receiveTransferStarted,
  receiveTransferVerified
} from '../actions/receive.actions';
import {
  selectReceiveDigest,
  selectReceiveFile,
  selectReceivePhase
} from '../selectors/receive.selectors';

@Injectable()
export class ReceiveEffects {
  private readonly store = inject(Store);
  private readonly router = inject(Router);
  private readonly identityService = inject(IdentityService);
  private readonly signaling = inject(SignalingService);
  private readonly transfer = inject(TransferService);
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
        this.signaling
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
        tap(() => this.signaling.close())
      ),
    { dispatch: false }
  );

  readonly disconnect$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(receiveDisconnect),
        tap(() => this.signaling.disconnect())
      ),
    { dispatch: false }
  );

  readonly peerDisconnected$ = createEffect(() =>
    this.signaling.peerDisconnected$.pipe(
      filter((notice) => notice.cancelledBy === 'sender'),
      tap(() => toast.warning('The sender canceled the transfer.')),
      map(() => receiveReset())
    )
  );

  readonly fileHash$ = createEffect(() =>
    this.signaling.peerFileHash$.pipe(
      map((digest) => receiveDigestReceived({ digest }))
    )
  );

  readonly startTransfer$ = createEffect(() =>
    this.actions$.pipe(
      ofType(receiveAccepted),
      withLatestFrom(
        this.store.select(selectReceiveFile),
        this.store.select(selectReceiveDigest)
      ),
      switchMap(([, file, digest]) => {
        if (!file || !digest) {
          return of(
            receiveTransferFailed({ error: 'missing file metadata or digest' })
          );
        }
        let startedAt = 0;
        return this.transfer.receive({ metadata: file, digest }).pipe(
          map((event) =>
            match(event)
              .with({ type: 'started' }, (e) => {
                startedAt = Date.now();
                return receiveTransferStarted({ total: e.total });
              })
              .with({ type: 'progress' }, (e) =>
                receiveTransferProgress({ received: e.transferred })
              )
              .with({ type: 'complete' }, () => receiveTransferComplete())
              .with({ type: 'verified' }, () =>
                receiveTransferVerified({ elapsed: Date.now() - startedAt })
              )
              .with({ type: 'failed' }, (e) =>
                receiveTransferFailed({ error: e.error })
              )
              .exhaustive()
          ),
          catchError((error) =>
            of(
              receiveTransferFailed({
                error: toErrorMessage(error, 'Transfer failed')
              })
            )
          ),
          takeUntil(
            this.actions$.pipe(
              ofType(receiveCodeEntered, receiveReset, receiveDisconnect)
            )
          )
        );
      })
    )
  );
}
