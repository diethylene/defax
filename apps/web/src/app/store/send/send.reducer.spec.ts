import type { FileMetadata } from '@contract/signal/file-metadata.model';
import type { Identity } from '@contract/signal/identity.model';
import { roomIdFromValue } from '@contract/signal/room-id.model';
import { describe, expect, it } from 'vitest';
import { SendActions } from './send.actions';
import { initialSendState, type SendState, sendFeature } from './send.reducer';

/** A valid room code for the tests. */
const roomId = roomIdFromValue(0);

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

const reduce = (state: SendState, ...actions: Parameters<typeof sendFeature.reducer>[1][]) =>
  actions.reduce(sendFeature.reducer, state);

const awaiting: SendState = reduce(
  initialSendState,
  SendActions.fileSelected({ file, metadata }),
  SendActions.roomCreated({ roomId }),
  SendActions.passwordGenerated({ password: 'pw' }),
);

const approved: SendState = reduce(
  awaiting,
  SendActions.sasComputed({ sas: '123456', peerIdentity }),
);

describe('sendFeature.reducer', () => {
  describe('success', () => {
    it('moves to AwaitingPeer when a file is selected', () => {
      const next = sendFeature.reducer(
        initialSendState,
        SendActions.fileSelected({ file, metadata }),
      );

      expect(next.status).toEqual({
        _tag: 'AwaitingPeer',
        file,
        metadata,
        password: '',
        hash: { _tag: 'Idle' },
      });
    });

    it('records the room and password while awaiting the peer', () => {
      expect(awaiting.status).toMatchObject({
        _tag: 'AwaitingPeer',
        roomId,
        password: 'pw',
      });
    });

    it('moves to SasConfirm with the sas and peer identity', () => {
      expect(approved.status).toMatchObject({
        _tag: 'SasConfirm',
        sas: '123456',
        peerIdentity,
        file,
        metadata,
      });
    });

    it('tracks hash progress and completion', () => {
      const hashing = reduce(
        awaiting,
        SendActions.hashStarted(),
        SendActions.hashProgress({ processed: 2 }),
      );
      const complete = reduce(hashing, SendActions.hashComplete({ digest: 'abc' }));

      expect(hashing.status).toMatchObject({
        hash: { _tag: 'Hashing', progress: 2 },
      });
      expect(complete.status).toMatchObject({
        hash: { _tag: 'Complete', digest: 'abc' },
      });
    });

    it('moves through the transfer states to Done with the duration', () => {
      const transferring = reduce(
        approved,
        SendActions.hashComplete({ digest: 'abc' }),
        SendActions.transferStarted({ total: 3 }),
        SendActions.transferProgress({ sent: 3 }),
      );
      const verifying = reduce(transferring, SendActions.transferComplete());
      const done = reduce(verifying, SendActions.transferVerified({ elapsed: 1500 }));

      expect(transferring.status).toMatchObject({
        _tag: 'Transferring',
        sent: 3,
        total: 3,
        hash: { _tag: 'Complete', digest: 'abc' },
      });
      expect(verifying.status._tag).toBe('Verifying');
      expect(done.status).toMatchObject({
        _tag: 'Done',
        sent: 3,
        total: 3,
        durationMs: 1500,
      });
    });
  });

  describe('invariants', () => {
    it('ignores a room created before a file is selected', () => {
      const next = sendFeature.reducer(initialSendState, SendActions.roomCreated({ roomId }));

      expect(next).toEqual(initialSendState);
    });

    it('ignores a sas before the room is created', () => {
      const selected = sendFeature.reducer(
        initialSendState,
        SendActions.fileSelected({ file, metadata }),
      );
      const next = sendFeature.reducer(
        selected,
        SendActions.sasComputed({ sas: '123456', peerIdentity }),
      );

      expect(next).toEqual(selected);
    });

    it('moves to Failed with the handshake tag', () => {
      const next = reduce(awaiting, SendActions.handshakeFailed());

      expect(next.status).toEqual({
        _tag: 'Failed',
        error: 'handshake-failed',
      });
    });

    it('moves to Failed with the hash tag', () => {
      const next = reduce(awaiting, SendActions.hashFailed());

      expect(next.status).toEqual({ _tag: 'Failed', error: 'hash-failed' });
    });

    it('moves to Failed with the transfer tag', () => {
      const next = reduce(approved, SendActions.transferFailed({ error: 'transfer-failed' }));

      expect(next.status).toEqual({
        _tag: 'Failed',
        error: 'transfer-failed',
      });
    });

    it('returns to Idle on reset', () => {
      const next = reduce(approved, SendActions.reset());

      expect(next).toEqual(initialSendState);
    });
  });
});
