import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import * as Result from 'effect/Result';
import { firstValueFrom } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TurnCredentialApiService } from './turn-credential-api.service';

/** Response metadata the API attaches to every success. */
const meta = {
  requestId: 'req-1',
  timestamp: '2026-11-20T10:00:00.000Z',
  apiVersion: '1.0.0',
};

/** ICE servers the API mints, as the wire returns them. */
const iceServers = [
  { urls: ['stun:stun.cloudflare.com:3478'] },
  { urls: ['turn:turn.cloudflare.com:3478'], username: 'user', credential: 'secret' },
];

/** Problem details the API returns when minting fails. */
const problem = {
  type: 'about:blank',
  title: 'Bad Gateway',
  status: 502,
  requestId: 'req-2',
  timestamp: '2026-11-20T10:00:01.000Z',
};

describe('TurnCredentialApiService', () => {
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
    it('decodes the enveloped ice servers', async () => {
      const result = firstValueFrom(TestBed.inject(TurnCredentialApiService).getIceServers(''));

      TestBed.inject(HttpTestingController)
        .expectOne({ method: 'POST', url: '/turn/credentials' })
        .flush({ status: 'success', data: { iceServers }, meta });

      expect(await result).toEqual(Result.succeed({ iceServers }));
    });
  });

  describe('invariants', () => {
    it('decodes a problem+json failure into the wire error', async () => {
      const result = firstValueFrom(TestBed.inject(TurnCredentialApiService).getIceServers(''));

      TestBed.inject(HttpTestingController)
        .expectOne({ method: 'POST', url: '/turn/credentials' })
        .flush(problem, { status: 502, statusText: 'Bad Gateway' });

      expect(await result).toMatchObject({ failure: { status: 502, title: 'Bad Gateway' } });
    });

    it('maps a response without a decodable body to a request failure', async () => {
      const result = firstValueFrom(TestBed.inject(TurnCredentialApiService).getIceServers(''));

      TestBed.inject(HttpTestingController)
        .expectOne({ method: 'POST', url: '/turn/credentials' })
        .flush('down', { status: 0, statusText: 'Unknown Error' });

      expect(await result).toMatchObject({ failure: { _tag: 'TurnCredentialRequestFailed' } });
    });

    it('maps a success body that fails the schema to a request failure', async () => {
      const result = firstValueFrom(TestBed.inject(TurnCredentialApiService).getIceServers(''));

      TestBed.inject(HttpTestingController)
        .expectOne({ method: 'POST', url: '/turn/credentials' })
        .flush({ status: 'success', data: { iceServers: [{ urls: 'not-an-array' }] }, meta });

      expect(await result).toMatchObject({ failure: { _tag: 'TurnCredentialRequestFailed' } });
    });

    it('never retries a failed mint', async () => {
      const result = firstValueFrom(TestBed.inject(TurnCredentialApiService).getIceServers(''));

      TestBed.inject(HttpTestingController)
        .expectOne({ method: 'POST', url: '/turn/credentials' })
        .flush(
          { ...problem, status: 503, title: 'Service Unavailable' },
          { status: 503, statusText: 'Service Unavailable' },
        );

      expect(await result).toMatchObject({ failure: { status: 503 } });
    });

    it('times out a hung request as a request failure', async () => {
      vi.useFakeTimers();
      const http = TestBed.inject(HttpTestingController);

      const result = firstValueFrom(TestBed.inject(TurnCredentialApiService).getIceServers(''));

      http.expectOne({ method: 'POST', url: '/turn/credentials' });
      await vi.advanceTimersByTimeAsync(10_000);

      expect(await result).toMatchObject({ failure: { _tag: 'TurnCredentialRequestFailed' } });
    });
  });
});
