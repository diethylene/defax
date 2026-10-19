import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import {
  catchError,
  defer,
  distinctUntilChanged,
  map,
  of,
  skip,
  switchMap,
  takeUntil,
  tap
} from 'rxjs';
import { routeForPhase } from '../../features/receive/receive-phase';
import { SignalTransport } from '../../shared/interfaces/signal-transport';
import { HandshakeService } from '../../shared/services/handshake.service';
import { IdentityService } from '../../shared/services/identity.service';
import { exchangePeerInfo } from '../../shared/services/peer-exchange';
import { SealedChannel } from '../../shared/services/sealed-channel';
import { toErrorMessage } from '../../shared/utilities/error-message';
import {
  receiveCodeEntered,
  receiveHandshakeFailed,
  receiveReset,
  receiveSasComputed
} from '../actions/receive.actions';
import { selectReceivePhase } from '../selectors/receive.selectors';

@Injectable()
export class ReceiveEffects {
  private readonly store = inject(Store);
  private readonly router = inject(Router);
  private readonly signalTransport = inject(SignalTransport);
  private readonly identityService = inject(IdentityService);
  private readonly actions$ = inject(Actions);
  private handshake: HandshakeService | null = null;

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
      switchMap(({ code }) => {
        this.handshake?.destroy();
        const handshake = new HandshakeService();
        this.handshake = handshake;
        const identity = this.identityService.detect();
        return defer(() => handshake.runAsResponder(this.signalTransport, code))
          .pipe(
            switchMap(({ signalingKey, sas, roomId }) => {
              const channel = new SealedChannel(
                this.signalTransport,
                signalingKey,
                roomId,
                'responder'
              );
              return exchangePeerInfo(channel, identity, null).pipe(
                map(({ peerIdentity, fileInfo }) =>
                  receiveSasComputed({ sas, peerIdentity, file: fileInfo })
                )
              );
            }),
            catchError((error) =>
              of(
                receiveHandshakeFailed({
                  error: toErrorMessage(error, 'Handshake failed')
                })
              )
            )
          )
          .pipe(takeUntil(this.actions$.pipe(ofType(receiveReset))));
      })
    )
  );

  readonly closeRoom$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(receiveReset),
        tap(() => {
          this.handshake?.destroy();
          this.handshake = null;
        })
      ),
    { dispatch: false }
  );
}
