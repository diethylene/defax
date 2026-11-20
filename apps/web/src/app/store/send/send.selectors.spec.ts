import type { FileMetadata } from '@contract/signal/file-metadata.model';
import type { Identity } from '@contract/signal/identity.model';
import { roomIdFromValue } from '@contract/signal/room-id.model';
import { describe, expect, it } from 'vitest';
import { selectSendErrorMessage, sendErrorMessages, transferProgressOf } from './send.selectors';
import type { SendStatus } from './send-transitions';

const failed = (error: keyof typeof sendErrorMessages): SendStatus => ({
  _tag: 'Failed',
  error,
});

const metadata: FileMetadata = {
  name: 'report.pdf',
  size: 3,
  mime: 'application/pdf',
  extension: 'pdf',
  lastModified: 1_700_000_000_000,
};

const peerIdentity: Identity = {
  browser: 'Firefox 121',
  os: 'Windows',
  timeZone: 'Europe/London',
  language: 'en-GB',
};

const transferring: SendStatus = {
  _tag: 'Transferring',
  file: new File(['abc'], 'report.pdf', { type: 'application/pdf' }),
  metadata,
  roomId: roomIdFromValue(0),
  password: 'pw',
  sas: '123456',
  peerIdentity,
  hash: { _tag: 'Complete', digest: 'abc' },
  sent: 2,
  total: 3,
  route: 'relay',
};

describe('selectSendErrorMessage', () => {
  describe('success', () => {
    it('returns the message for the current failure', () => {
      expect(selectSendErrorMessage.projector(failed('verification-failed'))).toBe(
        'receiver verification failed',
      );
    });
  });

  describe('invariants', () => {
    it('returns undefined while the send has not failed', () => {
      expect(selectSendErrorMessage.projector({ _tag: 'Idle' })).toBeUndefined();
    });

    it('has a message for every failure tag', () => {
      expect(Object.keys(sendErrorMessages).sort()).toEqual([
        'handshake-failed',
        'hash-failed',
        'transfer-failed',
        'verification-failed',
      ]);
    });
  });
});

describe('transferProgressOf', () => {
  describe('success', () => {
    it('returns the bytes moved and the negotiated route', () => {
      expect(transferProgressOf(transferring)).toEqual({ sent: 2, total: 3, route: 'relay' });
    });
  });

  describe('invariants', () => {
    it('returns undefined before the transfer starts', () => {
      expect(transferProgressOf({ _tag: 'Idle' })).toBeUndefined();
    });
  });
});
