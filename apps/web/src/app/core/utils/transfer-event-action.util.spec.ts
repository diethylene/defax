import type { Action } from '@ngrx/store';
import { describe, expect, it } from 'vitest';
import type { TransferEvent } from '../services/transfer.service';
import { type TransferEventActionSink, transferEventActionFor } from './transfer-event-action.util';
import type { TimedTransferEvent } from './transfer-event-time.operator';

/**
 * Builds a sink that records each call by its name and payload.
 * @returns The sink and the calls it recorded.
 */
const recordingSink = (): {
  readonly sink: TransferEventActionSink;
  readonly calls: readonly string[];
} => {
  const calls: string[] = [];

  const record = (label: string): Action => {
    calls.push(label);
    return { type: label };
  };

  const sink: TransferEventActionSink = {
    started: (total) => record(`started:${total}`),
    progress: (transferred) => record(`progress:${transferred}`),
    complete: () => record('complete'),
    verified: (elapsed) => record(`verified:${elapsed}`),
    failed: (error) => record(`failed:${error}`),
  };

  return { calls, sink };
};

/**
 * Builds a timed event with explicit clock readings.
 * @param event Event the transfer service emitted.
 * @param startedAt Clock reading of the transfer start.
 * @param at Clock reading of this event.
 * @returns The timed event.
 */
const timedAt = (event: TransferEvent, startedAt: number, at: number): TimedTransferEvent => ({
  event,
  startedAt,
  at,
});

describe('transferEventActionFor', () => {
  describe('success', () => {
    it('maps started to the total byte count', () => {
      const { sink, calls } = recordingSink();

      const action = transferEventActionFor(sink)(
        timedAt({ type: 'started', total: 3 }, 1_000, 1_000),
      );

      expect(action).toEqual({ type: 'started:3' });
      expect(calls).toEqual(['started:3']);
    });

    it('maps progress to the transferred byte count', () => {
      const { sink, calls } = recordingSink();

      const action = transferEventActionFor(sink)(
        timedAt({ type: 'progress', transferred: 2 }, 1_000, 1_200),
      );

      expect(action).toEqual({ type: 'progress:2' });
      expect(calls).toEqual(['progress:2']);
    });

    it('maps complete to the complete action', () => {
      const { sink, calls } = recordingSink();

      const action = transferEventActionFor(sink)(timedAt({ type: 'complete' }, 1_000, 1_500));

      expect(action).toEqual({ type: 'complete' });
      expect(calls).toEqual(['complete']);
    });

    it('computes the elapsed time for verified from the clock readings', () => {
      const { sink, calls } = recordingSink();

      const action = transferEventActionFor(sink)(timedAt({ type: 'verified' }, 1_000, 1_250));

      expect(action).toEqual({ type: 'verified:250' });
      expect(calls).toEqual(['verified:250']);
    });

    it('passes the failure tag through unchanged', () => {
      const { sink, calls } = recordingSink();

      const action = transferEventActionFor(sink)(
        timedAt({ type: 'failed', error: 'verification-failed' }, 1_000, 1_500),
      );

      expect(action).toEqual({ type: 'failed:verification-failed' });
      expect(calls).toEqual(['failed:verification-failed']);
    });
  });
});
