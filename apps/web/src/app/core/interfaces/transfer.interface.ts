/** Path a transfer takes between peers. */
export type TransferRoute = 'direct' | 'relay';

/** Role of this peer in a transfer. */
export type TransferMode = 'send' | 'receive';

/** Progress snapshot of one transfer. */
export interface TransferSnapshot {
  /** Bytes transferred so far. */
  transferred: number;
  /** Total bytes to transfer. */
  total: number;
  /** Negotiated transfer route, or undefined before it is known. */
  route: TransferRoute | undefined;
  /** Whether the receiver confirmed the file hash. */
  verified: boolean;
}
