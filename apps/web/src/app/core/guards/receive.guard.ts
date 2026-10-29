import type { CanActivateFn, CanDeactivateFn } from '@angular/router';
import {
  phaseForStatus,
  type ReceivePhase,
  routeForPhase,
} from '@web/features/receive/receive-phase/receive-phase.model';
import { ReceiveActions } from '@web/store/receive/receive.actions';
import { receiveFeature } from '@web/store/receive/receive.reducer';
import type { ReceiveStatus } from '@web/store/receive/receive-transitions';
import * as Match from 'effect/Match';
import { createPhaseRouteGuard } from './transfer-phase.guard';

/**
 * Tells whether leaving a status loses nothing.
 * @param status Current receive status.
 * @returns True when the receive is idle, done or failed.
 */
const isSafeToLeave = (status: ReceiveStatus): boolean =>
  Match.value(status).pipe(
    Match.when({ _tag: 'Idle' }, () => true),
    Match.when({ _tag: 'Done' }, () => true),
    Match.when({ _tag: 'Failed' }, () => true),
    Match.orElse(() => false),
  );

/** Guards the receive routes by the status the receive slice holds. */
const receiveGuards = createPhaseRouteGuard<ReceiveStatus, ReceivePhase>({
  selectStatus: receiveFeature.selectStatus,
  phaseForStatus,
  routeForPhase,
  disconnect: ReceiveActions.disconnect,
  isSafeToLeave,
});

/** Keeps a receive route on the page its status owns. */
export const receiveCanActivate: CanActivateFn = receiveGuards.canActivate;

/** Confirms before leaving a receive that is still running. */
export const receiveCanDeactivate: CanDeactivateFn<unknown> = receiveGuards.canDeactivate;
