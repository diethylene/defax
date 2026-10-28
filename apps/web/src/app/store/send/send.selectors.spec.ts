import { describe, expect, it } from 'vitest';
import type { SendStatus } from './send-transitions';
import { selectSendErrorMessage, sendErrorMessages } from './send.selectors';

const failed = (error: keyof typeof sendErrorMessages): SendStatus => ({
  _tag: 'Failed',
  error
});

describe('selectSendErrorMessage', () => {
  describe('success', () => {
    it('returns the message for the current failure', () => {
      expect(selectSendErrorMessage.projector(failed('verification-failed'))).toBe(
        'receiver verification failed'
      );
    });
  });

  describe('invariants', () => {
    it('returns undefined while the send has not failed', () => {
      expect(
        selectSendErrorMessage.projector({ _tag: 'Idle' })
      ).toBeUndefined();
    });

    it('has a message for every failure tag', () => {
      expect(Object.keys(sendErrorMessages).sort()).toEqual([
        'handshake-failed',
        'hash-failed',
        'transfer-failed',
        'verification-failed'
      ]);
    });
  });
});
