import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Actions, createEffect, ofType } from '@ngrx/effects';
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
  takeUntil,
  tap,
  withLatestFrom
} from 'rxjs';
import { routeForPhase } from '../../features/send/send-phase';
import { SignalTransport } from '../../shared/interfaces/signal-transport';
import { HandshakeService } from '../../shared/services/handshake.service';
import { HashService } from '../../shared/services/hash.service';
import { IdentityService } from '../../shared/services/identity.service';
import { exchangePeerInfo } from '../../shared/services/peer-exchange';
import { SealedChannel } from '../../shared/services/sealed-channel';
import { toErrorMessage } from '../../shared/utilities/error-message';
import { generatePassword } from '../../shared/utilities/password';
import {
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
import { selectSendFile, selectSendPhase } from '../selectors/send.selectors';

@Injectable()
export class SendEffects {
  private readonly store = inject(Store);
  private readonly router = inject(Router);
  private readonly hashService = inject(HashService);
  private readonly identityService = inject(IdentityService);
  private readonly signalTransport = inject(SignalTransport);
  private readonly actions$ = inject(Actions);
  private handshake: HandshakeService | null = null;

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
        this.handshake?.destroy();
        const { roomId, sid } = this.signalTransport.createRoom();
        const password = generatePassword();
        const handshake = new HandshakeService();
        this.handshake = handshake;
        const identity = this.identityService.detect();
        return concat(
          of(sendRoomCreated({ roomId }), sendPasswordGenerated({ password })),
          handshake
            .runAsInitiator(this.signalTransport, { roomId, sid, password })
            .pipe(
              switchMap(({ signalingKey, sas }) => {
                const channel = new SealedChannel(
                  this.signalTransport,
                  signalingKey,
                  roomId,
                  'initiator'
                );
                return exchangePeerInfo(channel, identity, metadata).pipe(
                  map(({ peerIdentity }) =>
                    sendSasComputed({ sas, peerIdentity })
                  )
                );
              }),
              catchError((error) =>
                of(
                  sendHandshakeFailed({
                    error: toErrorMessage(error, 'Handshake failed')
                  })
                )
              )
            )
        ).pipe(takeUntil(this.actions$.pipe(ofType(sendReset))));
      })
    )
  );

  readonly closeRoom$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(sendReset),
        tap(() => {
          this.handshake?.destroy();
          this.handshake = null;
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
}
