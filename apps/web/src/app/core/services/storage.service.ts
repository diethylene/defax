import { Injectable } from '@angular/core';
import { defer, from, map, Observable, switchMap, tap } from 'rxjs';

/** Database name used for transfer chunks. */
const DB_NAME = 'defax-transfer';
/** Object store name holding the chunks. */
const STORE_NAME = 'chunks';

/**
 * Opens the transfer database, creating the chunk store on first use.
 * @returns Observable emitting the open database.
 */
const openDatabase$ = (): Observable<IDBDatabase> =>
  new Observable((subscriber) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) {
        request.result.createObjectStore(STORE_NAME, { autoIncrement: true });
      }
    };
    request.onsuccess = () => {
      subscriber.next(request.result);
      subscriber.complete();
    };
    request.onerror = () =>
      subscriber.error(request.error ?? new Error('indexeddb open failed'));
  });

/**
 * Clears every stored chunk.
 * @param db Open database connection.
 * @returns Observable that completes once the store is cleared.
 */
const clearStore$ = (db: IDBDatabase): Observable<void> =>
  new Observable((subscriber) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).clear();
    tx.oncomplete = () => {
      subscriber.next();
      subscriber.complete();
    };
    tx.onerror = () =>
      subscriber.error(tx.error ?? new Error('indexeddb clear failed'));
  });

/**
 * Appends one chunk to the store.
 * @param db Open database connection.
 * @param data Chunk bytes to append.
 * @returns Observable that completes once the chunk is written.
 */
const putChunk$ = (db: IDBDatabase, data: ArrayBuffer): Observable<void> =>
  new Observable((subscriber) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const request = tx.objectStore(STORE_NAME).put(data);
    request.onsuccess = () => {
      subscriber.next();
      subscriber.complete();
    };
    request.onerror = () =>
      subscriber.error(request.error ?? new Error('indexeddb write failed'));
  });

/**
 * Reads every stored chunk in insertion order.
 * @param db Open database connection.
 * @returns Observable emitting the chunks once.
 */
const readAll$ = (db: IDBDatabase): Observable<ArrayBuffer[]> =>
  new Observable((subscriber) => {
    const store = db
      .transaction(STORE_NAME, 'readonly')
      .objectStore(STORE_NAME);
    const request: IDBRequest<ArrayBuffer[]> = store.getAll();
    request.onsuccess = () => {
      subscriber.next(request.result);
      subscriber.complete();
    };
    request.onerror = () =>
      subscriber.error(request.error ?? new Error('indexeddb read failed'));
  });

/**
 * Deletes the transfer database.
 * @returns Observable that completes once the database is gone or blocked.
 */
const deleteDatabase$ = (): Observable<void> =>
  new Observable((subscriber) => {
    const request = indexedDB.deleteDatabase(DB_NAME);
    request.onsuccess = () => {
      subscriber.next();
      subscriber.complete();
    };
    request.onblocked = () => {
      subscriber.next();
      subscriber.complete();
    };
    request.onerror = () =>
      subscriber.error(request.error ?? new Error('indexeddb delete failed'));
  });

/** Database state before it is opened or after it is closed. */
interface StorageClosed {
  /** Discriminant. */
  readonly _tag: 'closed';
}

/** Database state with an open connection. */
interface StorageOpen {
  /** Discriminant. */
  readonly _tag: 'open';
  /** Open database connection. */
  readonly db: IDBDatabase;
}

/** Lifecycle state of the transfer database. */
type StorageState = StorageClosed | StorageOpen;

/** Initial state before the database is opened. */
const CLOSED: StorageClosed = { _tag: 'closed' };

/** Stores transfer chunks in IndexedDB and assembles them into a blob. */
@Injectable({ providedIn: 'root' })
export class StorageService {
  /** Current database state. */
  private state: StorageState = CLOSED;

  /**
   * Opens the database and clears any previous chunks.
   * @returns Observable that completes once the store is ready.
   */
  open(): Observable<void> {
    return defer(() => openDatabase$()).pipe(
      switchMap((db) =>
        clearStore$(db).pipe(
          tap(() => {
            this.state = { _tag: 'open', db };
          })
        )
      )
    );
  }

  /**
   * Appends one chunk to the open database.
   * @param data Chunk bytes to append.
   * @returns Observable that completes once the chunk is written.
   */
  storeChunk(data: ArrayBuffer): Observable<void> {
    return defer(() => putChunk$(this.requireDb(), data));
  }

  /**
   * Reads every chunk into a blob.
   * @param mime MIME type of the assembled blob.
   * @returns Observable emitting the assembled blob.
   */
  assemble(mime: string): Observable<Blob> {
    return defer(() => readAll$(this.requireDb())).pipe(
      map((chunks) => new Blob(chunks, { type: mime }))
    );
  }

  /**
   * Reports storage usage for this origin.
   * @returns Observable emitting the storage estimate.
   */
  estimate(): Observable<StorageEstimate> {
    return defer(() => from(navigator.storage.estimate()));
  }

  /** Closes the database and deletes its contents. */
  close(): void {
    const current = this.state;
    this.state = CLOSED;
    if (current._tag === 'open') current.db.close();
    deleteDatabase$().subscribe();
  }

  /**
   * Saves a blob to disk through a temporary object URL.
   * @param blob Blob to save.
   * @param name File name to suggest to the browser.
   */
  download(blob: Blob, name: string): void {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = name;
    anchor.style.display = 'none';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  /**
   * Returns the open database connection.
   * @returns The open database connection.
   */
  private requireDb(): IDBDatabase {
    if (this.state._tag === 'closed') throw new Error('storage not open');
    return this.state.db;
  }
}
