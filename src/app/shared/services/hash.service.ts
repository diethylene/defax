import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import type {
  FileHashEvent,
  FileHashWorkerMessage
} from '../utilities/hash-protocol';

@Injectable({ providedIn: 'root' })
export class HashService {
  hashFile(file: File): Observable<FileHashEvent> {
    return new Observable<FileHashEvent>((subscriber) => {
      const worker = new Worker(
        new URL('../utilities/hash.worker.ts', import.meta.url),
        { type: 'module' }
      );

      const onMessage = (event: MessageEvent<FileHashWorkerMessage>): void => {
        const message = event.data;
        if (message.type === 'error') {
          subscriber.error(new Error(message.message));
          return;
        }
        subscriber.next(message);
        if (message.type === 'complete') {
          subscriber.complete();
        }
      };

      const onError = (event: ErrorEvent): void => {
        subscriber.error(new Error(event.message));
      };

      worker.addEventListener('message', onMessage);
      worker.addEventListener('error', onError);
      worker.postMessage({ file });

      return () => {
        worker.removeEventListener('message', onMessage);
        worker.removeEventListener('error', onError);
        worker.terminate();
      };
    });
  }
}
