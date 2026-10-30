import { inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { type Action, Store } from '@ngrx/store';
import { toast } from '@spartan-ng/brain/sonner';
import * as Match from 'effect/Match';
import {
  catchError,
  concat,
  EMPTY,
  filter,
  map,
  of,
  switchMap,
  take,
  takeUntil,
  tap,
  withLatestFrom,
} from 'rxjs';
import { createRouteToPhaseEffect } from '../../core/effects/route-to-phase.effect';
import { HashService } from '../../core/services/hash.service';
import { SignalingService } from '../../core/services/signaling.service';
import { type TransferErrorTag, TransferService } from '../../core/services/transfer.service';
import {
  type TransferEventActionSink,
  transferEventActionFor,
} from '../../core/utils/transfer-event-action.util';
import { timeTransferEvents } from '../../core/utils/transfer-event-time.util';
import { routeForPhase, type SendPhase } from '../../features/send/send-phase/send-phase.model';
import { IdentityService } from '../../shared/services/identity.service';
import type { FileHashEvent } from '../../shared/utilities/hash-protocol';
import { SendActions } from './send.actions';
import { selectSendPhase, selectSendStatus } from './send.selectors';
import type { SendErrorTag, SendStatus } from './send-transitions';

/** Store tag for each reason the transfer service reports. */
const sendErrorFor = {
  'storage-full': 'transfer-failed',
  'verification-failed': 'verification-failed',
} satisfies Record<TransferErrorTag, SendErrorTag>;

/** Send actions each transfer event becomes. */
const sendSink: TransferEventActionSink = {
  started: (total) => SendActions.transferStarted({ total }),
  progress: (sent) => SendActions.transferProgress({ sent }),
  complete: () => SendActions.transferComplete(),
  verified: (elapsed) => SendActions.transferVerified({ elapsed }),
  failed: (error) => SendActions.transferFailed({ error: sendErrorFor[error] }),
};

/**
 * Turns one hash event into the action the store expects.
 * @param event Event reported by the hash service.
 * @returns The matching send action.
 */
const hashActionFor = (event: FileHashEvent): Action =>
  Match.value(event).pipe(
    Match.discriminator('type')('progress', ({ processed }) =>
      SendActions.hashProgress({ processed }),
    ),
    Match.discriminator('type')('complete', ({ digest }) => SendActions.hashComplete({ digest })),
    Match.exhaustive,
  );

/**
 * Tells whether the peer is matched and the transfer can carry a digest.
 * @param status Current send status.
 * @returns True once the handshake completed.
 */
const isConnected = (status: SendStatus): boolean =>
  Match.value(status).pipe(
    Match.tag('SasConfirm', 'Transferring', 'Verifying', 'Done', () => true),
    Match.orElse(() => false),
  );

/** Navigates to the route that matches the send status. */
export const sendRouteToPhase$ = createRouteToPhaseEffect<SendPhase, SendPhase>({
  selectStatus: selectSendPhase,
  phaseForStatus: (phase) => phase,
  routeForPhase,
});

/** Creates the room and runs the handshake when a file is chosen. */
export const sendStartSession$ = createEffect(
  (
    actions$ = inject(Actions),
    signaling = inject(SignalingService),
    identity = inject(IdentityService),
  ) =>
    actions$.pipe(
      ofType(SendActions.fileSelected),
      switchMap(({ metadata }) => {
        const session = signaling.createSession();
        return concat(
          of(
            SendActions.roomCreated({ roomId: session.roomId }),
            SendActions.passwordGenerated({ password: session.password }),
          ),
          signaling.connectAsInitiator(session, identity.detect(), metadata).pipe(
            map(({ sas, peerIdentity }) => SendActions.sasComputed({ sas, peerIdentity })),
            catchError(() => of(SendActions.handshakeFailed())),
          ),
        );
      }),
    ),
  { functional: true },
);

/** Closes the signalling room when the send is reset. */
export const sendCloseRoom$ = createEffect(
  (actions$ = inject(Actions), signaling = inject(SignalingService)) =>
    actions$.pipe(
      ofType(SendActions.reset),
      tap(() => signaling.close()),
    ),
  { dispatch: false, functional: true },
);

/** Disconnects from the peer when the send is cancelled. */
export const sendDisconnect$ = createEffect(
  (actions$ = inject(Actions), signaling = inject(SignalingService)) =>
    actions$.pipe(
      ofType(SendActions.disconnect),
      tap(() => signaling.disconnect()),
    ),
  { dispatch: false, functional: true },
);

/** Resets the send when the receiver cancels. */
export const sendPeerDisconnected$ = createEffect(
  (signaling = inject(SignalingService)) =>
    signaling.peerDisconnected$.pipe(
      filter((notice) => notice.cancelledBy === 'receiver'),
      tap(() => toast.warning('The receiver canceled the transfer.')),
      map(() => SendActions.reset()),
    ),
  { functional: true },
);

/** Hashes the chosen file and reports progress. */
export const sendHashFile$ = createEffect(
  (actions$ = inject(Actions), hashService = inject(HashService)) =>
    actions$.pipe(
      ofType(SendActions.fileSelected),
      switchMap(({ file }) =>
        concat(
          of(SendActions.hashStarted()),
          hashService.hashFile(file).pipe(
            map(hashActionFor),
            catchError(() => of(SendActions.hashFailed())),
            takeUntil(actions$.pipe(ofType(SendActions.reset, SendActions.disconnect))),
          ),
        ),
      ),
    ),
  { functional: true },
);

/** Hands the finished digest to the receiver once the handshake completes. */
export const sendFileHash$ = createEffect(
  (actions$ = inject(Actions), store = inject(Store), signaling = inject(SignalingService)) =>
    actions$.pipe(
      ofType(SendActions.hashComplete),
      switchMap(({ digest }) =>
        store.select(selectSendStatus).pipe(
          filter(isConnected),
          takeUntil(
            actions$.pipe(
              ofType(SendActions.fileSelected, SendActions.reset, SendActions.disconnect),
            ),
          ),
          take(1),
          tap(() => signaling.sendFileHash(digest)),
        ),
      ),
    ),
  { dispatch: false, functional: true },
);

/** Starts the transfer once both peers confirmed the sas. */
export const sendStartTransfer$ = createEffect(
  (actions$ = inject(Actions), store = inject(Store), transfer = inject(TransferService)) =>
    actions$.pipe(
      ofType(SendActions.sasComputed),
      withLatestFrom(store.select(selectSendStatus)),
      switchMap(([, status]) =>
        Match.value(status).pipe(
          Match.tag('SasConfirm', ({ file }) =>
            transfer.send(file).pipe(
              timeTransferEvents(),
              map(transferEventActionFor(sendSink)),
              catchError(() =>
                of(
                  SendActions.transferFailed({
                    error: 'transfer-failed',
                  }),
                ),
              ),
              takeUntil(
                actions$.pipe(
                  ofType(SendActions.fileSelected, SendActions.reset, SendActions.disconnect),
                ),
              ),
            ),
          ),
          Match.orElse(() => EMPTY),
        ),
      ),
    ),
  { functional: true },
);

/** Every send effect, registered together. */
export const sendEffects = {
  sendRouteToPhase$,
  sendStartSession$,
  sendCloseRoom$,
  sendDisconnect$,
  sendPeerDisconnected$,
  sendHashFile$,
  sendFileHash$,
  sendStartTransfer$,
};
