/** Database state before it is opened or after it is closed. */
export interface StorageClosed {
  /** Discriminant. */
  readonly _tag: 'closed';
}

/** Database state with an open connection. */
export interface StorageOpen {
  /** Discriminant. */
  readonly _tag: 'open';
  /** Open database connection. */
  readonly db: IDBDatabase;
}

/** Lifecycle state of the transfer database. */
export type StorageState = StorageClosed | StorageOpen;
