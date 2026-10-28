import type { ReceiveStatus } from '../../../store/receive/receive-transitions';

/** Page a receive status shows. */
export type ReceivePhase =
  | 'idle'
  | 'connecting'
  | 'confirming'
  | 'transferring'
  | 'verifying'
  | 'done'
  | 'failed';

/** Route that shows each receive phase. */
const receivePhaseRoutes: Record<ReceivePhase, string> = {
  idle: '/receive',
  connecting: '/receive',
  confirming: '/receive/confirm',
  transferring: '/receive/transfer',
  verifying: '/receive/transfer',
  done: '/receive/complete',
  failed: '/receive/failed',
};

/** Phase that shows each receive status. */
const receivePhases: Record<ReceiveStatus['_tag'], ReceivePhase> = {
  Idle: 'idle',
  Connecting: 'connecting',
  Confirming: 'confirming',
  Transferring: 'transferring',
  Verifying: 'verifying',
  Done: 'done',
  Failed: 'failed',
};

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
