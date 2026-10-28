/** Page a send status shows. */
export type SendPhase =
  | 'idle'
  | 'awaitingPeer'
  | 'sasConfirm'
  | 'transferring'
  | 'verifying'
  | 'done'
  | 'failed';

/** Route that shows each send phase. */
const sendPhaseRoutes: Record<SendPhase, string> = {
  idle: '/send',
  awaitingPeer: '/send/code',
  sasConfirm: '/send/approve',
  transferring: '/send/transfer',
  verifying: '/send/transfer',
  done: '/send/complete',
  failed: '/send/failed',
};

/**
 * Reads the route that shows a send phase.
 * @param phase Page to show.
 * @returns URL of that page.
 */
export const routeForPhase = (phase: SendPhase): string => sendPhaseRoutes[phase];
