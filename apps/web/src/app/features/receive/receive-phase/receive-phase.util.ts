import type { ReceiveStatus } from '../../../store/receive/receive-transitions';
import type { ReceivePhase } from './receive-phase.type';

/** Route that shows each receive phase. */
const receivePhaseRoutes = {
  idle: '/receive',
  connecting: '/receive',
  confirming: '/receive/confirm',
  transferring: '/receive/transfer',
  verifying: '/receive/transfer',
  done: '/receive/complete',
  failed: '/receive/failed',
} satisfies Record<ReceivePhase, string>;

/** Phase that shows each receive status. */
const receivePhases = {
  Idle: 'idle',
  Connecting: 'connecting',
  Confirming: 'confirming',
  Transferring: 'transferring',
  Verifying: 'verifying',
  Done: 'done',
  Failed: 'failed',
} satisfies Record<ReceiveStatus['_tag'], ReceivePhase>;

/**
 * Maps a receive status to the page that shows it.
 * @param status Current receive status.
 * @returns Page for that status.
 */
export const phaseForStatus = (status: ReceiveStatus): ReceivePhase => receivePhases[status._tag];

/**
 * Reads the route that shows a receive phase.
 * @param phase Page to show.
 * @returns URL of that page.
 */
export const routeForPhase = (phase: ReceivePhase): string => receivePhaseRoutes[phase];
