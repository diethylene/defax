import { TestBed } from '@angular/core/testing';
import type { Health } from '@contract/health/health.model';
import { Actions } from '@ngrx/effects';
import type { Action } from '@ngrx/store';
import { HealthApiService } from '@web/core/api/health-api.service';
import { HealthRequestFailed } from '@web/core/api/health-api-errors.model';
import * as Result from 'effect/Result';
import { firstValueFrom, type Observable, of } from 'rxjs';
import { describe, expect, it } from 'vitest';
import { HealthActions } from './health.actions';
import { checkHealth$ } from './health.effects';

/**
 * Runs checkHealth$ once against a fake API returning a fixed result.
 * @param result What the fake API returns.
 * @returns The first action the effect emits.
 */
const runCheck = (result: Result.Result<Health, HealthRequestFailed>): Promise<Action> => {
  TestBed.configureTestingModule({
    providers: [
      {
        provide: Actions,
        useValue: new Actions(of(HealthActions.checkRequested())),
      },
      {
        provide: HealthApiService,
        useValue: { getHealth: (): Observable<typeof result> => of(result) },
      },
    ],
  });
  return firstValueFrom(TestBed.runInInjectionContext(() => checkHealth$()));
};

describe('checkHealth$', () => {
  describe('success', () => {
    it('emits checkSucceeded with the report', async () => {
      const health: Health = { status: 'ok', version: '1.0.0' };

      expect(await runCheck(Result.succeed(health))).toEqual(
        HealthActions.checkSucceeded({ health }),
      );
    });
  });

  describe('invariants', () => {
    it('emits checkFailed when the API is unreachable', async () => {
      const emitted = await runCheck(Result.fail(new HealthRequestFailed({ cause: 'offline' })));

      expect(emitted).toEqual(HealthActions.checkFailed());
    });
  });
});
