import { Injectable } from '@angular/core';
import { defer, from, map, Observable, switchMap, tap } from 'rxjs';

const DB_NAME = 'defax-transfer';
const STORE_NAME = 'chunks';

function openDatabase$(): Observable<IDBDatabase> {
  return new Observable((subscriber) => {
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
}

function clearStore$(db: IDBDatabase): Observable<void> {
  return new Observable((subscriber) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).clear();
    tx.oncomplete = () => {
      subscriber.next();
      subscriber.complete();
    };
    tx.onerror = () =>
      subscriber.error(tx.error ?? new Error('indexeddb clear failed'));
  });
}

function putChunk$(db: IDBDatabase, data: ArrayBuffer): Observable<void> {
  return new Observable((subscriber) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const request = tx.objectStore(STORE_NAME).put(data);
    request.onsuccess = () => {
      subscriber.next();
      subscriber.complete();
    };
    request.onerror = () =>
      subscriber.error(request.error ?? new Error('indexeddb write failed'));
  });
}

function readAll$(db: IDBDatabase): Observable<ArrayBuffer[]> {
  return new Observable((subscriber) => {
    const store = db
      .transaction(STORE_NAME, 'readonly')
      .objectStore(STORE_NAME);
    const request = store.getAll();
    request.onsuccess = () => {
      subscriber.next(request.result as ArrayBuffer[]);
      subscriber.complete();
    };
    request.onerror = () =>
      subscriber.error(request.error ?? new Error('indexeddb read failed'));
  });
}

function deleteDatabase$(): Observable<void> {
  return new Observable((subscriber) => {
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
}

@Injectable({ providedIn: 'root' })
export class StorageService {
  private db: IDBDatabase | null = null;

  open(): Observable<void> {
    return defer(() => openDatabase$()).pipe(
      switchMap((db) =>
        clearStore$(db).pipe(
          tap(() => {
            this.db = db;
          })
        )
      )
    );
  }

  storeChunk(data: ArrayBuffer): Observable<void> {
    return defer(() => putChunk$(this.requireDb(), data));
  }

  assemble(mime: string): Observable<Blob> {
    return defer(() => readAll$(this.requireDb())).pipe(
      map((chunks) => new Blob(chunks, { type: mime }))
    );
  }

  estimate(): Observable<StorageEstimate> {
    return defer(() => from(navigator.storage.estimate()));
  }

  close(): void {
    const db = this.db;
    this.db = null;
    db?.close();
    deleteDatabase$().subscribe();
  }

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

  private requireDb(): IDBDatabase {
    if (!this.db) throw new Error('storage not open');
    return this.db;
  }
}
