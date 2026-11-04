/** Page a send status shows. */
export type SendPhase =
  | 'idle'
  | 'awaitingPeer'
  | 'sasConfirm'
  | 'transferring'
  | 'verifying'
  | 'done'
  | 'failed';
