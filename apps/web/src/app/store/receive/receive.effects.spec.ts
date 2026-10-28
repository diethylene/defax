import { TestBed } from '@angular/core/testing';
import type { FileMetadata } from '@contract/signal/file-metadata.model';
import type { Identity } from '@contract/signal/identity.model';
import { provideEffects } from '@ngrx/effects';
import { provideStore, Store } from '@ngrx/store';
import { SignalingService } from '@web/core/services/signaling.service';
import { EMPTY, filter, firstValueFrom, of, take, throwError } from 'rxjs';
import { describe, expect, it } from 'vitest';
import { ReceiveActions } from './receive.actions';
import { connect$, startTransfer$ } from './receive.effects';
import { receiveFeature } from './receive.reducer';
import type { ReceiveStatus } from './receive-transitions';

const peerIdentity: Identity = {
  browser: 'Chrome 122',
  os: 'macOS',
  timeZone: 'Europe/London',
  language: 'en-GB',
};

const fileInfo: FileMetadata = {
  name: 'report.pdf',
  size: 12345,
  mime: 'application/pdf',
  extension: 'pdf',
  lastModified: 0,
};

/**
 * Wires the receive slice with a fake signaling service.
 * @param connectAsResponder What the fake responder connection does.
 */
const configure = (connectAsResponder: () => unknown): void => {
  TestBed.configureTestingModule({
    providers: [
      provideStore({ receive: receiveFeature.reducer }),
      provideEffects({ connect$, startTransfer$ }),
      {
        provide: SignalingService,
        useValue: {
          connectAsResponder,
          close: () => undefined,
          disconnect: () => undefined,
          peerDisconnected$: EMPTY,
          peerFileHash$: EMPTY,
        },
      },
    ],
  });
};

/**
 * Resolves with the first status the predicate accepts.
 * @param status Predicate picking the status to wait for.
 * @returns The matching status.
 */
const statusWhere = (status: (value: ReceiveStatus) => boolean): Promise<ReceiveStatus> =>
  firstValueFrom(
    TestBed.inject(Store)
      .select(receiveFeature.selectStatus)
      .pipe(filter(status), take(1)),
  );

describe('connect$', () => {
  describe('success', () => {
    it('dispatches the sas when the connection is established', async () => {
      configure(() => of({ sas: '654321', peerIdentity, fileInfo }));

      const confirmed = statusWhere((status) => status._tag === 'Confirming');

      TestBed.inject(Store).dispatch(ReceiveActions.codeEntered({ code: '123456-apple-bird' }));

      await expect(confirmed).resolves.toEqual({
        _tag: 'Confirming',
        sas: '654321',
        peerIdentity,
        file: fileInfo,
        digest: undefined,
      });
    });
  });

  describe('invariants', () => {
    it('dispatches handshake failed when the connection errors', async () => {
      configure(() => throwError(() => new Error('invalid code')));

      const failed = statusWhere((status) => status._tag === 'Failed');

      TestBed.inject(Store).dispatch(ReceiveActions.codeEntered({ code: 'invalid' }));

      await expect(failed).resolves.toEqual({ _tag: 'Failed', error: 'handshake-failed' });
    });
  });
});
