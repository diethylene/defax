import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { toast } from '@spartan-ng/brain/sonner';
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
  take,
  takeUntil,
  tap,
  withLatestFrom
} from 'rxjs';
import { match } from 'ts-pattern';
import { HashService } from '../../core/services/hash.service';
import { SignalingService } from '../../core/services/signaling.service';
import { TransferService } from '../../core/services/transfer.service';
import {
  routeForPhase,
  type SendPhase
} from '../../features/send/send-phase/send-phase';
import { IdentityService } from '../../shared/services/identity.service';
import { toErrorMessage } from '../../shared/utilities/error-message';
import {
  sendDisconnect,
  sendFileSelected,
  sendHandshakeFailed,
  sendHashComplete,
  sendHashFailed,
  sendHashProgress,
  sendHashStarted,
  sendPasswordGenerated,
  sendReset,
  sendRoomCreated,
  sendSasComputed,
  sendTransferComplete,
  sendTransferFailed,
  sendTransferProgress,
  sendTransferStarted,
  sendTransferVerified
} from '../actions/send.actions';
import { selectSendFile, selectSendPhase } from '../selectors/send.selectors';

@Injectable()
export class SendEffects {
  private readonly store = inject(Store);
  private readonly router = inject(Router);
  private readonly hashService = inject(HashService);
  private readonly identityService = inject(IdentityService);
  private readonly signaling = inject(SignalingService);
  private readonly transfer = inject(TransferService);
  private readonly actions$ = inject(Actions);

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

  readonly startSession$ = createEffect(() =>
    this.actions$.pipe(
      ofType(sendFileSelected),
      switchMap(({ metadata }) => {
        const session = this.signaling.createSession();
        return concat(
          of(
            sendRoomCreated({ roomId: session.roomId }),
            sendPasswordGenerated({ password: session.password })
          ),
          this.signaling
            .connectAsInitiator(
              session,
              this.identityService.detect(),
              metadata
            )
            .pipe(
              map(({ sas, peerIdentity }) =>
                sendSasComputed({ sas, peerIdentity })
              ),
              catchError((error) =>
                of(
                  sendHandshakeFailed({
                    error: toErrorMessage(error, 'Handshake failed')
                  })
                )
              )
            )
        );
      })
    )
  );

  readonly closeRoom$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(sendReset),
        tap(() => this.signaling.close())
      ),
    { dispatch: false }
  );

  readonly disconnect$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(sendDisconnect),
        tap(() => this.signaling.disconnect())
      ),
    { dispatch: false }
  );

  readonly peerDisconnected$ = createEffect(() =>
    this.signaling.peerDisconnected$.pipe(
      filter((notice) => notice.cancelledBy === 'receiver'),
      tap(() => toast.warning('The receiver canceled the transfer.')),
      map(() => sendReset())
    )
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
              match(event)
                .with({ type: 'progress' }, (e) =>
                  sendHashProgress({ processed: e.processed })
                )
                .with({ type: 'complete' }, (e) =>
                  sendHashComplete({ digest: e.digest })
                )
                .exhaustive()
            ),
            catchError((error: unknown) =>
              of(
                sendHashFailed({
                  error: toErrorMessage(error, 'File hashing failed')
                })
              )
            )
          )
        );
      })
    )
  );

  readonly sendFileHash$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(sendHashComplete),
        switchMap(({ digest }) =>
          this.store.select(selectSendPhase).pipe(
            filter(isConnectedPhase),
            takeUntil(
              this.actions$.pipe(
                ofType(sendFileSelected, sendReset, sendDisconnect)
              )
            ),
            take(1),
            tap(() => this.signaling.sendFileHash(digest))
          )
        )
      ),
    { dispatch: false }
  );

  readonly startTransfer$ = createEffect(() =>
    this.actions$.pipe(
      ofType(sendSasComputed),
      withLatestFrom(this.store.select(selectSendFile)),
      switchMap(([, file]) => {
        if (!file) return EMPTY;
        return this.transfer.send(file).pipe(
          map((event) =>
            match(event)
              .with({ type: 'started' }, (e) =>
                sendTransferStarted({ total: e.total })
              )
              .with({ type: 'progress' }, (e) =>
                sendTransferProgress({ sent: e.transferred })
              )
              .with({ type: 'complete' }, () => sendTransferComplete())
              .with({ type: 'verified' }, () => sendTransferVerified())
              .with({ type: 'failed' }, (e) =>
                sendTransferFailed({ error: e.error })
              )
              .exhaustive()
          ),
          catchError((error) =>
            of(
              sendTransferFailed({
                error: toErrorMessage(error, 'Transfer failed')
              })
            )
          ),
          takeUntil(
            this.actions$.pipe(
              ofType(sendFileSelected, sendReset, sendDisconnect)
            )
          )
        );
      })
    )
  );
}

function isConnectedPhase(phase: SendPhase): boolean {
  return match(phase)
    .with('sasConfirm', 'transferring', 'verifying', 'done', () => true)
    .otherwise(() => false);
}
