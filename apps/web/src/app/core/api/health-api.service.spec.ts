import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import * as Result from 'effect/Result';
import { firstValueFrom } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HealthApiService } from './health-api.service';

describe('HealthApiService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
  });

  afterEach(() => {
    TestBed.inject(HttpTestingController).verify();
    vi.useRealTimers();
  });

  describe('success', () => {
    it('decodes the report with the shared contract', async () => {
      const result = firstValueFrom(TestBed.inject(HealthApiService).getHealth());

      TestBed.inject(HttpTestingController)
        .expectOne('/api/health')
        .flush({ status: 'ok', version: '1.0.0' });

      expect(await result).toEqual(Result.succeed({ status: 'ok', version: '1.0.0' }));
    });
  });

  describe('invariants', () => {
    it('turns a body that fails the contract into HealthRequestFailed', async () => {
      const result = firstValueFrom(TestBed.inject(HealthApiService).getHealth());

      TestBed.inject(HttpTestingController).expectOne('/api/health').flush({ status: 'degraded' });

      expect(await result).toMatchObject({
        failure: { _tag: 'HealthRequestFailed' },
      });
    });

    it('gives up after two retries and reports HealthRequestFailed', async () => {
      vi.useFakeTimers();
      const http = TestBed.inject(HttpTestingController);
      const result = firstValueFrom(TestBed.inject(HealthApiService).getHealth());

      http.expectOne('/api/health').flush({}, { status: 503, statusText: 'Unavailable' });
      await vi.advanceTimersByTimeAsync(2_000);
      http.expectOne('/api/health').flush({}, { status: 503, statusText: 'Unavailable' });
      await vi.advanceTimersByTimeAsync(2_000);
      http.expectOne('/api/health').flush({}, { status: 503, statusText: 'Unavailable' });

      expect(await result).toMatchObject({
        failure: { _tag: 'HealthRequestFailed' },
      });
    });
  });
});
