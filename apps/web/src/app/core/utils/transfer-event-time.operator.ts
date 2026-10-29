import { type OperatorFunction, scan, timestamp } from 'rxjs';
import type { TransferEvent } from '../services/transfer.service';

/** A transfer event paired with the clock readings used to time the transfer. */
export interface TimedTransferEvent {
  /** Event the transfer service emitted. */
  readonly event: TransferEvent;
  /** When the transfer started, in milliseconds since the epoch. */
  readonly startedAt: number;
  /** When this event arrived, in milliseconds since the epoch. */
  readonly at: number;
}

/**
 * Stamps each transfer event with its arrival time and the transfer start time.
 * @returns Operator pairing each event with its clock readings.
 */
export const timeTransferEvents =
  (): OperatorFunction<TransferEvent, TimedTransferEvent> => (source) =>
    source.pipe(
      timestamp(),
      scan(
        (timed, { value, timestamp: at }): TimedTransferEvent => ({
          event: value,
          at,
          startedAt: value.type === 'started' ? at : timed.startedAt,
        }),
        // Scan never emits its seed, and the first real event is always 'started'.
        { event: { type: 'complete' }, at: 0, startedAt: 0 } satisfies TimedTransferEvent,
      ),
    );
