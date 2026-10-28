import type { Provider } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { FileMetadata } from '@contract/signal/file-metadata.model';
import type { Identity } from '@contract/signal/identity.model';
import { Actions } from '@ngrx/effects';
import type { Action } from '@ngrx/store';
import { Store } from '@ngrx/store';
import { HashService } from '@web/core/services/hash.service';
import { SignalingService } from '@web/core/services/signaling.service';
import { TransferService } from '@web/core/services/transfer.service';
import { IdentityService } from '@web/shared/services/identity.service';
import { firstValueFrom, type Observable, of, throwError, toArray } from 'rxjs';
import { describe, expect, it } from 'vitest';
import { SendActions } from './send.actions';
import { sendHashFile$, sendStartSession$, sendStartTransfer$ } from './send.effects';
import { initialSendState, sendFeature } from './send.reducer';
import type { SendStatus } from './send-transitions';

const peerIdentity: Identity = {
  browser: 'Firefox 121',
  os: 'Windows',
  timeZone: 'Europe/London',
  language: 'en-GB',
};

const metadata: FileMetadata = {
  name: 'report.pdf',
  size: 3,
  mime: 'application/pdf',
  extension: 'pdf',
  lastModified: 1_700_000_000_000,
};

const file = new File(['abc'], 'report.pdf', {
  type: 'application/pdf',
  lastModified: 1_700_000_000_000,
});

const readyStatus = (): SendStatus =>
  [
    SendActions.fileSelected({ file, metadata }),
    SendActions.roomCreated({ roomId: 'room-1' }),
    SendActions.passwordGenerated({ password: 'pw' }),
    SendActions.sasComputed({ sas: '123456', peerIdentity }),
  ].reduce<SendStatus>(
    (status, action) => sendFeature.reducer({ status }, action).status,
    initialSendState.status,
  );

/**
 * Runs a functional effect once and collects every action it emits.
 * @param effect Effect factory to run in the injection context.
 * @param providers Providers the effect needs.
 * @returns Every action emitted before the effect completes.
 */
const run = (effect: () => Observable<Action>, providers: Provider[]): Promise<Action[]> => {
  TestBed.configureTestingModule({ providers });
  return firstValueFrom(TestBed.runInInjectionContext(effect).pipe(toArray()));
};

const actionsFor = (action: Action): Provider => ({
  provide: Actions,
  useValue: new Actions(of(action)),
});

describe('sendStartSession$', () => {
  describe('success', () => {
    it('emits the room, password and sas', async () => {
      const emitted = await run(sendStartSession$, [
        actionsFor(SendActions.fileSelected({ file, metadata })),
        {
          provide: SignalingService,
          useValue: {
            createSession: () => ({
              roomId: 'room-1',
              sid: new Uint8Array(16),
              password: 'pw',
            }),
            connectAsInitiator: () => of({ sas: '123456', peerIdentity }),
          },
        },
        { provide: IdentityService, useValue: { detect: () => peerIdentity } },
      ]);

      expect(emitted).toEqual([
        SendActions.roomCreated({ roomId: 'room-1' }),
        SendActions.passwordGenerated({ password: 'pw' }),
        SendActions.sasComputed({ sas: '123456', peerIdentity }),
      ]);
    });
  });

  describe('invariants', () => {
    it('emits the handshake failure tag when the handshake throws', async () => {
      const emitted = await run(sendStartSession$, [
        actionsFor(SendActions.fileSelected({ file, metadata })),
        {
          provide: SignalingService,
          useValue: {
            createSession: () => ({
              roomId: 'room-1',
              sid: new Uint8Array(16),
              password: 'pw',
            }),
            connectAsInitiator: () => throwError(() => new Error('nope')),
          },
        },
        { provide: IdentityService, useValue: { detect: () => peerIdentity } },
      ]);

      expect(emitted.at(-1)).toEqual(SendActions.handshakeFailed());
    });
  });
});

describe('sendHashFile$', () => {
  describe('success', () => {
    it('emits started, progress and complete', async () => {
      const emitted = await run(sendHashFile$, [
        actionsFor(SendActions.fileSelected({ file, metadata })),
        {
          provide: HashService,
          useValue: {
            hashFile: () =>
              of({ type: 'progress', processed: 1, total: 3 }, { type: 'complete', digest: 'abc' }),
          },
        },
      ]);

      expect(emitted).toEqual([
        SendActions.hashStarted(),
        SendActions.hashProgress({ processed: 1 }),
        SendActions.hashComplete({ digest: 'abc' }),
      ]);
    });
  });

  describe('invariants', () => {
    it('emits the hash failure tag when hashing throws', async () => {
      const emitted = await run(sendHashFile$, [
        actionsFor(SendActions.fileSelected({ file, metadata })),
        {
          provide: HashService,
          useValue: {
            hashFile: () => throwError(() => new Error('boom')),
          },
        },
      ]);

      expect(emitted).toEqual([SendActions.hashStarted(), SendActions.hashFailed()]);
    });
  });
});

describe('sendStartTransfer$', () => {
  const storeWith = (status: SendStatus): Provider => ({
    provide: Store,
    useValue: { select: () => of(status) },
  });

  const transferOf = (events: Observable<unknown>): Provider => ({
    provide: TransferService,
    useValue: { send: () => events },
  });

  describe('success', () => {
    it('emits the transfer actions through to verified', async () => {
      const emitted = await run(sendStartTransfer$, [
        actionsFor(SendActions.sasComputed({ sas: '123456', peerIdentity })),
        storeWith(readyStatus()),
        transferOf(
          of(
            { type: 'started', total: 3 },
            { type: 'progress', transferred: 3 },
            { type: 'complete' },
            { type: 'verified' },
          ),
        ),
      ]);

      expect(emitted.slice(0, 3)).toEqual([
        SendActions.transferStarted({ total: 3 }),
        SendActions.transferProgress({ sent: 3 }),
        SendActions.transferComplete(),
      ]);
      expect(emitted.at(-1)).toMatchObject({
        type: '[Send] Transfer Verified',
      });
    });
  });

  describe('invariants', () => {
    it('emits the verification tag when the receiver rejects the digest', async () => {
      const emitted = await run(sendStartTransfer$, [
        actionsFor(SendActions.sasComputed({ sas: '123456', peerIdentity })),
        storeWith(readyStatus()),
        transferOf(
          of({ type: 'started', total: 3 }, { type: 'failed', error: 'verification-failed' }),
        ),
      ]);

      expect(emitted.at(-1)).toEqual(SendActions.transferFailed({ error: 'verification-failed' }));
    });

    it('emits the transfer tag when the transfer throws', async () => {
      const emitted = await run(sendStartTransfer$, [
        actionsFor(SendActions.sasComputed({ sas: '123456', peerIdentity })),
        storeWith(readyStatus()),
        transferOf(throwError(() => new Error('channel closed'))),
      ]);

      expect(emitted.at(-1)).toEqual(SendActions.transferFailed({ error: 'transfer-failed' }));
    });

    it('emits nothing when the send is not past the handshake', async () => {
      const emitted = await run(sendStartTransfer$, [
        actionsFor(SendActions.sasComputed({ sas: '123456', peerIdentity })),
        storeWith({ _tag: 'Idle' }),
        transferOf(of({ type: 'started', total: 3 })),
      ]);

      expect(emitted).toEqual([]);
    });
  });
});
