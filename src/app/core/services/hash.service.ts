import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { match } from 'ts-pattern';
import type {
  FileHashEvent,
  FileHashWorkerMessage
} from '../../shared/utilities/hash-protocol';

@Injectable({ providedIn: 'root' })
export class HashService {
  hashFile(file: File): Observable<FileHashEvent> {
    return new Observable<FileHashEvent>((subscriber) => {
      const worker = new Worker(
        new URL('../../shared/utilities/hash.worker.ts', import.meta.url),
        { type: 'module' }
      );

      const onMessage = (event: MessageEvent<FileHashWorkerMessage>): void => {
        match(event.data)
          .with({ type: 'error' }, ({ message }) => {
            subscriber.error(new Error(message));
          })
          .with({ type: 'progress' }, (message) => {
            subscriber.next(message);
          })
          .with({ type: 'complete' }, (message) => {
            subscriber.next(message);
            subscriber.complete();
          })
          .exhaustive();
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
