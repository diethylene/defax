import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { sidFromBytes } from '@contract/signal/sid.model';
import * as Result from 'effect/Result';
import { firstValueFrom } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RoomsApiService } from './rooms-api.service';

/** Response metadata the API attaches to every success. */
const meta = {
  requestId: 'req-1',
  timestamp: '2026-11-20T10:00:00.000Z',
  apiVersion: '1.0.0',
};

/** Room code the API draws, as the wire returns it. */
const roomId = '123456';

/** A valid 16-byte session id in its base64url wire form. */
const sid = sidFromBytes(new Uint8Array(16));

/** Problem details the API returns when creating a room fails. */
const problem = {
  type: 'about:blank',
  title: 'Bad Gateway',
  status: 502,
  requestId: 'req-2',
  timestamp: '2026-11-20T10:00:01.000Z',
};

describe('RoomsApiService', () => {
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
    it('decodes the enveloped room creation', async () => {
      const result = firstValueFrom(TestBed.inject(RoomsApiService).createRoom(''));

      TestBed.inject(HttpTestingController)
        .expectOne({ method: 'POST', url: '/rooms/create' })
        .flush({ status: 'success', data: { roomId, sid }, meta });

      expect(await result).toEqual(Result.succeed({ roomId, sid }));
    });
  });

  describe('invariants', () => {
    it('decodes a problem+json failure into the wire error', async () => {
      const result = firstValueFrom(TestBed.inject(RoomsApiService).createRoom(''));

      TestBed.inject(HttpTestingController)
        .expectOne({ method: 'POST', url: '/rooms/create' })
        .flush(problem, { status: 502, statusText: 'Bad Gateway' });

      expect(await result).toMatchObject({ failure: { status: 502, title: 'Bad Gateway' } });
    });

    it('maps a response without a decodable body to a request failure', async () => {
      const result = firstValueFrom(TestBed.inject(RoomsApiService).createRoom(''));

      TestBed.inject(HttpTestingController)
        .expectOne({ method: 'POST', url: '/rooms/create' })
        .flush('down', { status: 0, statusText: 'Unknown Error' });

      expect(await result).toMatchObject({ failure: { _tag: 'RoomsRequestFailed' } });
    });

    it('maps a success body that fails the schema to a request failure', async () => {
      const result = firstValueFrom(TestBed.inject(RoomsApiService).createRoom(''));

      TestBed.inject(HttpTestingController)
        .expectOne({ method: 'POST', url: '/rooms/create' })
        .flush({ status: 'success', data: { roomId, sid: 'AAAA' }, meta });

      expect(await result).toMatchObject({ failure: { _tag: 'RoomsRequestFailed' } });
    });

    it('never retries a failed creation', async () => {
      const result = firstValueFrom(TestBed.inject(RoomsApiService).createRoom(''));

      TestBed.inject(HttpTestingController)
        .expectOne({ method: 'POST', url: '/rooms/create' })
        .flush(
          { ...problem, status: 503, title: 'Service Unavailable' },
          { status: 503, statusText: 'Service Unavailable' },
        );

      expect(await result).toMatchObject({ failure: { status: 503 } });
    });

    it('times out a hung request as a request failure', async () => {
      vi.useFakeTimers();
      const http = TestBed.inject(HttpTestingController);

      const result = firstValueFrom(TestBed.inject(RoomsApiService).createRoom(''));

      http.expectOne({ method: 'POST', url: '/rooms/create' });
      await vi.advanceTimersByTimeAsync(10_000);

      expect(await result).toMatchObject({ failure: { _tag: 'RoomsRequestFailed' } });
    });
  });
});
