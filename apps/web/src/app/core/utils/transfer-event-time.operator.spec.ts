import { firstValueFrom, Subject, take, toArray } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { TransferEvent } from '../services/transfer.service';
import { type TimedTransferEvent, timeTransferEvents } from './transfer-event-time.operator';

/**
 * Emits each event at the given clock reading and collects the timed events.
 * @param emissions Events with the time each one arrives.
 * @returns The timed events, in order.
 */
const timedAt = (
  emissions: readonly { readonly at: number; readonly event: TransferEvent }[],
): Promise<TimedTransferEvent[]> => {
  const events$ = new Subject<TransferEvent>();
  const timed$ = timeTransferEvents()(events$).pipe(take(emissions.length), toArray());
  const result = firstValueFrom(timed$);
  emissions.forEach(({ at, event }) => {
    vi.setSystemTime(at);
    events$.next(event);
  });
  return result;
};

describe('timeTransferEvents', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('success', () => {
    it('stamps the first event with its arrival time', async () => {
      const timed = await timedAt([{ at: 1_000, event: { type: 'started', total: 3 } }]);

      expect(timed).toEqual([
        { event: { type: 'started', total: 3 }, startedAt: 1_000, at: 1_000 },
      ]);
    });

    it('restarts the clock when a later started event arrives', async () => {
      const timed = await timedAt([
        { at: 1_000, event: { type: 'started', total: 3 } },
        { at: 1_200, event: { type: 'progress', transferred: 1 } },
        { at: 2_000, event: { type: 'started', total: 3 } },
      ]);

      expect(timed.at(-1)).toEqual({
        event: { type: 'started', total: 3 },
        startedAt: 2_000,
        at: 2_000,
      });
    });
  });

  describe('invariants', () => {
    it('leaves the start time at zero when the first event is not started', async () => {
      const timed = await timedAt([{ at: 500, event: { type: 'complete' } }]);

      expect(timed).toEqual([{ event: { type: 'complete' }, startedAt: 0, at: 500 }]);
    });
  });
});
