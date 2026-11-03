import type { SendPhase } from './send-phase.type';

/** Route that shows each send phase. */
const sendPhaseRoutes = {
  idle: '/send',
  awaitingPeer: '/send/code',
  sasConfirm: '/send/approve',
  transferring: '/send/transfer',
  verifying: '/send/transfer',
  done: '/send/complete',
  failed: '/send/failed',
} satisfies Record<SendPhase, string>;

/**
 * Reads the route that shows a send phase.
 * @param phase Page to show.
 * @returns URL of that page.
 */
export const routeForPhase = (phase: SendPhase): string => sendPhaseRoutes[phase];
