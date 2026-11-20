import type { TransferRoute } from '../interfaces/transfer.interface';

/** Why a transfer stopped, at the granularity the store reports. */
export type TransferErrorTag = 'storage-full' | 'verification-failed';

/** Progress and outcome of one file transfer. */
export type TransferEvent =
  /** Transfer began, carrying the total byte count. */
  | { readonly type: 'started'; readonly total: number }
  /** Path the bytes travel, known once the channel opens. */
  | { readonly type: 'route'; readonly route: TransferRoute }
  /** Bytes moved so far. */
  | { readonly type: 'progress'; readonly transferred: number }
  /** Every byte has been sent or received. */
  | { readonly type: 'complete' }
  /** The receiver confirmed the file digest. */
  | { readonly type: 'verified' }
  /** The transfer stopped, carrying the reason. */
  | { readonly type: 'failed'; readonly error: TransferErrorTag };
