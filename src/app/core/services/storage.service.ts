import { Injectable } from '@angular/core';

const DB_NAME = 'defax-transfer';
const STORE_NAME = 'chunks';

interface ChunkRecord {
  index: number;
  data: ArrayBuffer;
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) {
        request.result.createObjectStore(STORE_NAME, { keyPath: 'index' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error ?? new Error('indexeddb open failed'));
  });
}

function clearStore(db: IDBDatabase): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error('indexeddb clear failed'));
  });
}

function putChunk(
  db: IDBDatabase,
  index: number,
  data: ArrayBuffer
): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const request = tx.objectStore(STORE_NAME).put({ index, data });
    request.onsuccess = () => resolve();
    request.onerror = () =>
      reject(request.error ?? new Error('indexeddb write failed'));
  });
}

function readAll(db: IDBDatabase): Promise<ChunkRecord[]> {
  return new Promise((resolve, reject) => {
    const store = db
      .transaction(STORE_NAME, 'readonly')
      .objectStore(STORE_NAME);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result as ChunkRecord[]);
    request.onerror = () =>
      reject(request.error ?? new Error('indexeddb read failed'));
  });
}

function deleteDatabase(): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(DB_NAME);
    request.onsuccess = () => resolve();
    request.onblocked = () => resolve();
    request.onerror = () =>
      reject(request.error ?? new Error('indexeddb delete failed'));
  });
}

@Injectable({ providedIn: 'root' })
export class StorageService {
  private db: IDBDatabase | null = null;

  async open(): Promise<void> {
    const db = await openDatabase();
    await clearStore(db);
    this.db = db;
  }

  async storeChunk(index: number, data: ArrayBuffer): Promise<void> {
    await putChunk(this.requireDb(), index, data);
  }

  async assemble(mime: string): Promise<Blob> {
    const records = await readAll(this.requireDb());
    records.sort((a, b) => a.index - b.index);
    return new Blob(
      records.map((record) => record.data),
      { type: mime }
    );
  }

  async close(): Promise<void> {
    const db = this.db;
    this.db = null;
    db?.close();
    await deleteDatabase();
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
