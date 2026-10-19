import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { toast } from '@spartan-ng/brain/sonner';
import {
  catchError,
  combineLatest,
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
import { match } from 'ts-pattern';
import {
  routeForPhase,
  type SendPhase
} from '../../features/send/send-phase/send-phase';
import { ConnectionService } from '../../shared/services/connection.service';
import { HashService } from '../../shared/services/hash.service';
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
  sendSasComputed
} from '../actions/send.actions';
import {
  selectSendFile,
  selectSendHashDigest,
  selectSendPhase
} from '../selectors/send.selectors';

@Injectable()
export class SendEffects {
  private readonly store = inject(Store);
  private readonly router = inject(Router);
  private readonly hashService = inject(HashService);
  private readonly identityService = inject(IdentityService);
  private readonly connection = inject(ConnectionService);
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
        const session = this.connection.createSession();
        return concat(
          of(
            sendRoomCreated({ roomId: session.roomId }),
            sendPasswordGenerated({ password: session.password })
          ),
          this.connection
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
        tap(() => this.connection.close())
      ),
    { dispatch: false }
  );

  readonly disconnect$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(sendDisconnect),
        tap(() => this.connection.disconnect())
      ),
    { dispatch: false }
  );

  readonly peerDisconnected$ = createEffect(() =>
    this.connection.peerDisconnected$.pipe(
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
      combineLatest([
        this.store.select(selectSendHashDigest),
        this.store.select(selectSendPhase)
      ]).pipe(
        filter(
          (value): value is [string, SendPhase] =>
            value[0] !== null && isConnectedPhase(value[1])
        ),
        map(([digest]) => digest),
        distinctUntilChanged(),
        tap((digest) => this.connection.sendFileHash(digest))
      ),
    { dispatch: false }
  );
}

function isConnectedPhase(phase: SendPhase): boolean {
  return match(phase)
    .with('sasConfirm', 'transferring', 'verifying', 'done', () => true)
    .otherwise(() => false);
}
