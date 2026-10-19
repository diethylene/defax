export type ReceivePhase =
  | 'idle'
  | 'confirming'
  | 'transferring'
  | 'verifying'
  | 'done'
  | 'failed';

const receivePhaseRoutes: Record<ReceivePhase, string> = {
  idle: '/receive',
  confirming: '/receive/confirm',
  transferring: '/receive/transfer',
  verifying: '/receive/verify',
  done: '/receive/complete',
  failed: '/receive/failed'
};

export function routeForPhase(phase: ReceivePhase): string {
  return receivePhaseRoutes[phase];
}
