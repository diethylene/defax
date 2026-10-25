import { HttpClient } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { Health } from '@contract/health/health.model';
import { pipe } from 'effect/Function';
import * as Result from 'effect/Result';
import * as Schema from 'effect/Schema';
import { catchError, map, type Observable, of, retry, timeout, timer } from 'rxjs';
import { HealthRequestFailed } from './health-api-errors.model';

/**
 * Waits before retrying a failed read, with jittered exponential backoff.
 * @param _error The failure (every failure of this idempotent read is retried).
 * @param attempt Retry number, starting at 1.
 * @returns A timer to retry after.
 */
const backoff = (_error: unknown, attempt: number): Observable<number> =>
  timer(2 ** attempt * 200 * (0.5 + Math.random()));

/** Typed access to the health endpoint; the response is decoded with the shared contract. */
@Service()
export class HealthApiService {
  /** Angular HTTP client. */
  private readonly http = inject(HttpClient);

  /**
   * Loads the API health report, retrying failures.
   * @returns The report or a typed failure; never errors.
   */
  getHealth(): Observable<Result.Result<Health, HealthRequestFailed>> {
    return this.http.get<unknown>('/api/health').pipe(
      timeout(5_000),
      retry({ count: 2, delay: backoff }),
      map((body) =>
        pipe(
          Schema.decodeUnknownResult(Health)(body),
          Result.mapError((cause) => new HealthRequestFailed({ cause })),
        ),
      ),
      catchError((cause: unknown) => of(Result.fail(new HealthRequestFailed({ cause })))),
    );
  }
}
