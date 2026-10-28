import { Injectable } from '@angular/core';
import * as Match from 'effect/Match';
import { Observable } from 'rxjs';
import type { FileHashEvent, FileHashWorkerMessage } from '../../shared/utilities/hash-protocol';

/** Hashes files in a worker and reports progress as an observable. */
@Injectable({ providedIn: 'root' })
export class HashService {
  /**
   * Hashes one file in a dedicated worker.
   * @param file File to hash.
   * @returns Observable of progress and completion events.
   */
  hashFile(file: File): Observable<FileHashEvent> {
    return new Observable<FileHashEvent>((subscriber) => {
      const worker = new Worker(new URL('../../shared/utilities/hash.worker.ts', import.meta.url), {
        type: 'module',
      });

      /** Routes one worker message to the subscriber. */
      const onMessage = (event: MessageEvent<FileHashWorkerMessage>): void => {
        Match.value(event.data).pipe(
          Match.when({ type: 'error' }, ({ message }) => {
            subscriber.error(new Error(message));
          }),
          Match.when({ type: 'progress' }, (message) => {
            subscriber.next(message);
          }),
          Match.when({ type: 'complete' }, (message) => {
            subscriber.next(message);
            subscriber.complete();
          }),
          Match.exhaustive,
        );
      };

      /** Fails the subscriber when the worker itself errors. */
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
