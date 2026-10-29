import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { type Action, Store } from '@ngrx/store';
import { toast } from '@spartan-ng/brain/sonner';
import { SignalingService } from '@web/core/services/signaling.service';
import { TransferService } from '@web/core/services/transfer.service';
import {
  type TransferEventActionSink,
  transferEventActionFor,
} from '@web/core/utils/transfer-event-action.util';
import { timeTransferEvents } from '@web/core/utils/transfer-event-time.operator';
import {
  phaseForStatus,
  routeForPhase,
} from '@web/features/receive/receive-phase/receive-phase.model';
import { IdentityService } from '@web/shared/services/identity.service';
import * as Match from 'effect/Match';
import {
  catchError,
  distinctUntilChanged,
  filter,
  map,
  type Observable,
  of,
  skip,
  switchMap,
  takeUntil,
  tap,
  withLatestFrom,
} from 'rxjs';
import { ReceiveActions } from './receive.actions';
import { receiveFeature } from './receive.reducer';
import type { ReceiveStatus } from './receive-transitions';

/** Receive actions each transfer event becomes. */
const receiveSink: TransferEventActionSink = {
  started: (total) => ReceiveActions.transferStarted({ total }),
  progress: (received) => ReceiveActions.transferProgress({ received }),
  complete: () => ReceiveActions.transferComplete(),
  verified: (elapsed) => ReceiveActions.transferVerified({ elapsed }),
  failed: (error) => ReceiveActions.transferFailed({ error }),
};

/**
 * Hands a transferring status to the transfer service until it settles.
 * @param transfer Service moving the bytes.
 * @param actions$ Store actions, used to cancel the transfer.
 * @param status Current receive status.
 * @returns Actions describing the transfer.
 */
const receiveEvents = (
  transfer: TransferService,
  actions$: Observable<Action>,
  status: ReceiveStatus,
): Observable<Action> =>
  Match.value(status).pipe(
    Match.when({ _tag: 'Transferring' }, (active) =>
      transfer.receive({ metadata: active.file, digest: active.digest }).pipe(
        timeTransferEvents(),
        map(transferEventActionFor(receiveSink)),
        catchError(() => of(ReceiveActions.transferFailed({ error: 'transfer-failed' }))),
        takeUntil(
          actions$.pipe(
            ofType(ReceiveActions.codeEntered, ReceiveActions.reset, ReceiveActions.disconnect),
          ),
        ),
      ),
    ),
    Match.orElse(() => of(ReceiveActions.transferFailed({ error: 'missing-metadata' }))),
  );

/** Navigates to the route that shows the current status. */
export const routeToPhase$ = createEffect(
  (store = inject(Store), router = inject(Router)) =>
    store.select(receiveFeature.selectStatus).pipe(
      map(phaseForStatus),
      distinctUntilChanged(),
      skip(1),
      tap((phase) => {
        const url = routeForPhase(phase);
        if (router.url !== url) {
          void router.navigateByUrl(url);
        }
      }),
    ),
  { functional: true, dispatch: false },
);

/** Connects to the sender once a code is entered. */
export const connect$ = createEffect(
  (
    actions$ = inject(Actions),
    signaling = inject(SignalingService),
    identity = inject(IdentityService),
  ) =>
    actions$.pipe(
      ofType(ReceiveActions.codeEntered),
      switchMap(({ code }) =>
        signaling.connectAsResponder(code, identity.detect()).pipe(
          map(({ sas, peerIdentity, fileInfo }) =>
            ReceiveActions.sasComputed({ sas, peerIdentity, file: fileInfo ?? undefined }),
          ),
          catchError(() => of(ReceiveActions.handshakeFailed())),
        ),
      ),
    ),
  { functional: true },
);

/** Closes the room when the receive is reset. */
export const closeRoom$ = createEffect(
  (actions$ = inject(Actions), signaling = inject(SignalingService)) =>
    actions$.pipe(
      ofType(ReceiveActions.reset),
      tap(() => signaling.close()),
    ),
  { functional: true, dispatch: false },
);

/** Disconnects from signaling when the receive is abandoned. */
export const disconnect$ = createEffect(
  (actions$ = inject(Actions), signaling = inject(SignalingService)) =>
    actions$.pipe(
      ofType(ReceiveActions.disconnect),
      tap(() => signaling.disconnect()),
    ),
  { functional: true, dispatch: false },
);

/** Resets the receive when the sender cancels. */
export const peerDisconnected$ = createEffect(
  (signaling = inject(SignalingService)) =>
    signaling.peerDisconnected$.pipe(
      filter((notice) => notice.cancelledBy === 'sender'),
      tap(() => toast.warning('The sender canceled the transfer.')),
      map(() => ReceiveActions.reset()),
    ),
  { functional: true },
);

/** Records the digest the sender announced. */
export const fileHash$ = createEffect(
  (signaling = inject(SignalingService)) =>
    signaling.peerFileHash$.pipe(map((digest) => ReceiveActions.digestReceived({ digest }))),
  { functional: true },
);

/** Starts receiving once the user accepts. */
export const startTransfer$ = createEffect(
  (actions$ = inject(Actions), store = inject(Store), transfer = inject(TransferService)) =>
    actions$.pipe(
      ofType(ReceiveActions.accepted),
      withLatestFrom(store.select(receiveFeature.selectStatus)),
      switchMap(([, status]) => receiveEvents(transfer, actions$, status)),
    ),
  { functional: true },
);
