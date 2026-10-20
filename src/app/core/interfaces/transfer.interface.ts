export type TransferRoute = 'direct' | 'relay';

export type TransferMode = 'send' | 'receive';

export interface TransferSnapshot {
  transferred: number;
  total: number;
  route: TransferRoute | null;
  verified: boolean;
}
