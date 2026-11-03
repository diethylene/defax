/** Page a receive status shows. */
export type ReceivePhase =
  | 'idle'
  | 'connecting'
  | 'confirming'
  | 'transferring'
  | 'verifying'
  | 'done'
  | 'failed';
