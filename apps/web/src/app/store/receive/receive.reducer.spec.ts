import type { FileMetadata } from '@contract/signal/file-metadata.model';
import type { Identity } from '@contract/signal/identity.model';
import { describe, expect, it } from 'vitest';
import { ReceiveActions } from './receive.actions';
import {
  initialReceiveState,
  type ReceiveState,
  receiveFeature,
} from './receive.reducer';

const peerIdentity: Identity = {
  browser: 'Firefox 121',
  os: 'Windows',
  timeZone: 'Europe/London',
  language: 'en-GB',
};

const file: FileMetadata = {
  name: 'report.pdf',
  size: 12345,
  mime: 'application/pdf',
  extension: 'pdf',
  lastModified: 1700000000000,
};

const digest = 'a1b2c3';

const connecting: ReceiveState = receiveFeature.reducer(
  initialReceiveState,
  ReceiveActions.codeEntered({ code: '123456-apple-bird' }),
);

const confirming: ReceiveState = receiveFeature.reducer(
  connecting,
  ReceiveActions.sasComputed({ sas: '654321', peerIdentity, file }),
);

const confirmingWithDigest: ReceiveState = receiveFeature.reducer(
  confirming,
  ReceiveActions.digestReceived({ digest }),
);

const transferring: ReceiveState = receiveFeature.reducer(
  confirmingWithDigest,
  ReceiveActions.accepted(),
);

describe('receiveFeature.reducer', () => {
  describe('success', () => {
    it('records the sas, peer and file and moves to Confirming', () => {
      const next = receiveFeature.reducer(
        connecting,
        ReceiveActions.sasComputed({ sas: '654321', peerIdentity, file }),
      );

      expect(next.status).toEqual({
        _tag: 'Confirming',
        sas: '654321',
        peerIdentity,
        file,
        digest: undefined,
      });
    });

    it('starts transferring with fresh progress when the transfer is accepted', () => {
      expect(transferring.status).toEqual({
        _tag: 'Transferring',
        file,
        peerIdentity,
        digest,
        progress: { received: 0, total: 0, route: 'direct' },
      });
    });

    it('records the announced total when the transfer starts', () => {
      const next = receiveFeature.reducer(
        transferring,
        ReceiveActions.transferStarted({ total: 12345 }),
      );

      expect(next.status).toEqual({
        _tag: 'Transferring',
        file,
        peerIdentity,
        digest,
        progress: { received: 0, total: 12345, route: 'direct' },
      });
    });

    it('records received bytes while transferring', () => {
      const started = receiveFeature.reducer(
        transferring,
        ReceiveActions.transferStarted({ total: 12345 }),
      );

      const next = receiveFeature.reducer(
        started,
        ReceiveActions.transferProgress({ received: 4096 }),
      );

      expect(next.status).toEqual({
        _tag: 'Transferring',
        file,
        peerIdentity,
        digest,
        progress: { received: 4096, total: 12345, route: 'direct' },
      });
    });

    it('records the elapsed time and moves to Done when the file verifies', () => {
      const verifying = receiveFeature.reducer(
        receiveFeature.reducer(
          transferring,
          ReceiveActions.transferStarted({ total: 12345 }),
        ),
        ReceiveActions.transferComplete(),
      );

      const next = receiveFeature.reducer(
        verifying,
        ReceiveActions.transferVerified({ elapsed: 4200 }),
      );

      expect(next.status).toEqual({
        _tag: 'Done',
        file,
        peerIdentity,
        digest,
        elapsedMs: 4200,
      });
    });
  });

  describe('invariants', () => {
    it('drops the previous status when a code is entered', () => {
      const failed: ReceiveState = receiveFeature.reducer(
        connecting,
        ReceiveActions.handshakeFailed(),
      );

      const next = receiveFeature.reducer(
        failed,
        ReceiveActions.codeEntered({ code: '123456-apple-bird' }),
      );

      expect(next.status).toEqual({ _tag: 'Connecting', code: '123456-apple-bird' });
    });

    it('fails with handshake-failed when the handshake fails', () => {
      const next = receiveFeature.reducer(
        connecting,
        ReceiveActions.handshakeFailed(),
      );

      expect(next.status).toEqual({ _tag: 'Failed', error: 'handshake-failed' });
    });

    it('fails with missing-metadata when accepted without a digest', () => {
      const next = receiveFeature.reducer(confirming, ReceiveActions.accepted());

      expect(next.status).toEqual({ _tag: 'Failed', error: 'missing-metadata' });
    });

    it('fails with the tag the transfer carried', () => {
      const next = receiveFeature.reducer(
        transferring,
        ReceiveActions.transferFailed({ error: 'storage-full' }),
      );

      expect(next.status).toEqual({ _tag: 'Failed', error: 'storage-full' });
    });

    it('resets to the initial state', () => {
      expect(receiveFeature.reducer(transferring, ReceiveActions.reset())).toEqual(
        initialReceiveState,
      );
    });

    it('resets to the initial state when disconnected', () => {
      expect(receiveFeature.reducer(transferring, ReceiveActions.disconnect())).toEqual(
        initialReceiveState,
      );
    });

    it('keeps the file, peer and progress when the transfer completes', () => {
      const verifying = receiveFeature.reducer(
        transferring,
        ReceiveActions.transferComplete(),
      ).status;

      expect(verifying).toEqual({
        _tag: 'Verifying',
        file,
        peerIdentity,
        digest,
        progress: { received: 0, total: 0, route: 'direct' },
      });
    });
  });
});
