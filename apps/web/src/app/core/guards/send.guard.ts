import type { CanActivateFn, CanDeactivateFn } from '@angular/router';
import * as Match from 'effect/Match';
import { routeForPhase, type SendPhase } from '../../features/send/send-phase/send-phase.model';
import { SendActions } from '../../store/send/send.actions';
import { phaseForStatus, selectSendStatus } from '../../store/send/send.selectors';
import type { SendStatus } from '../../store/send/send-transitions';
import { createPhaseRouteGuard } from './transfer-phase.guard';

/**
 * Tells whether leaving a status loses nothing.
 * @param status Current send status.
 * @returns True when nothing is in flight.
 */
const isSafeToLeave = (status: SendStatus): boolean =>
  Match.value(status).pipe(
    Match.tag('Idle', 'Done', 'Failed', () => true),
    Match.orElse(() => false),
  );

/** Guards the send routes by the status the send slice holds. */
const sendGuards = createPhaseRouteGuard<SendStatus, SendPhase>({
  selectStatus: selectSendStatus,
  phaseForStatus: (status) => phaseForStatus[status._tag],
  routeForPhase,
  disconnect: SendActions.disconnect,
  isSafeToLeave,
});

/** Keeps a send route on the page its status owns. */
export const sendCanActivate: CanActivateFn = sendGuards.canActivate;

/** Confirms before leaving a send that is still running. */
export const sendCanDeactivate: CanDeactivateFn<unknown> = sendGuards.canDeactivate;
