export type ReceivePhase =
  | 'idle'
  | 'connecting'
  | 'confirming'
  | 'transferring'
  | 'verifying'
  | 'done'
  | 'failed';

const receivePhaseRoutes: Record<ReceivePhase, string> = {
  idle: '/receive',
  connecting: '/receive',
  confirming: '/receive/confirm',
  transferring: '/receive/transfer',
  verifying: '/receive/transfer',
  done: '/receive/complete',
  failed: '/receive/failed'
};

export function routeForPhase(phase: ReceivePhase): string {
  return receivePhaseRoutes[phase];
}
