export type SendPhase =
  | 'idle'
  | 'awaitingPeer'
  | 'sasConfirm'
  | 'transferring'
  | 'verifying'
  | 'done'
  | 'failed';

const sendPhaseRoutes: Record<SendPhase, string> = {
  idle: '/send',
  awaitingPeer: '/send/code',
  sasConfirm: '/send/approve',
  transferring: '/send/transfer',
  verifying: '/send/verify',
  done: '/send/complete',
  failed: '/send/failed'
};

export function routeForPhase(phase: SendPhase): string {
  return sendPhaseRoutes[phase];
}
