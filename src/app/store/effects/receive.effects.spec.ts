import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { provideEffects } from '@ngrx/effects';
import { provideStore, Store } from '@ngrx/store';
import { filter, firstValueFrom, of, take, throwError } from 'rxjs';
import type { FileMetadata } from '../../shared/interfaces/file-metadata';
import type { Identity } from '../../shared/interfaces/identity';
import { ConnectionService } from '../../shared/services/connection.service';
import { receiveCodeEntered } from '../actions/receive.actions';
import { receiveReducer } from '../reducers/receive.reducer';
import {
  selectReceivePhase,
  selectReceiveSas
} from '../selectors/receive.selectors';
import { ReceiveEffects } from './receive.effects';

const peerIdentity: Identity = {
  browser: 'Chrome 122',
  os: 'macOS',
  timeZone: 'Europe/London',
  language: 'en-GB'
};

const fileInfo: FileMetadata = {
  name: 'report.pdf',
  size: 12345,
  mime: 'application/pdf',
  extension: 'pdf',
  lastModified: 0
};

function configure(connectAsResponder: () => unknown): void {
  TestBed.configureTestingModule({
    providers: [
      provideStore({ receive: receiveReducer }),
      provideEffects(ReceiveEffects),
      {
        provide: ConnectionService,
        useValue: {
          connectAsResponder,
          close: () => {}
        } as unknown as ConnectionService
      },
      {
        provide: Router,
        useValue: { url: '', navigateByUrl: () => Promise.resolve(true) }
      }
    ]
  });
}

describe('ReceiveEffects', () => {
  it('dispatches the sas when the connection is established', async () => {
    configure(() => of({ sas: '654321', peerIdentity, fileInfo }));
    const store = TestBed.inject(Store);

    const sas = firstValueFrom(
      store.select(selectReceiveSas).pipe(
        filter((value): value is string => value !== null),
        take(1)
      )
    );

    store.dispatch(receiveCodeEntered({ code: '123456-apple-bird' }));

    await expect(sas).resolves.toBe('654321');
  });

  it('dispatches handshake failed when the connection errors', async () => {
    configure(() => throwError(() => new Error('invalid code')));
    const store = TestBed.inject(Store);

    const phase = firstValueFrom(
      store.select(selectReceivePhase).pipe(
        filter((value): value is 'failed' => value === 'failed'),
        take(1)
      )
    );

    store.dispatch(receiveCodeEntered({ code: 'invalid' }));

    await expect(phase).resolves.toBe('failed');
  });
});
