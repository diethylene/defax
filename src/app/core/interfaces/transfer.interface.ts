export type TransferRoute = 'direct' | 'relay';

export interface TransferSnapshot {
  transferred: number;
  total: number;
  route: TransferRoute | null;
  verified: boolean;
}
