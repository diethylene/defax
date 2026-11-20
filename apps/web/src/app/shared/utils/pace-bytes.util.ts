import {
  asyncScheduler,
  concatMap,
  defer,
  delay,
  type MonoTypeOperatorFunction,
  of,
  type SchedulerLike,
  scan,
} from 'rxjs';

/** Milliseconds in one second, used to turn the byte ceiling into a time budget. */
const MILLISECONDS_PER_SECOND = 1000;

/** One chunk and the bytes the schedule has accounted for once it is sent. */
interface PacedChunk {
  /** Bytes scheduled for sending, including this chunk. */
  readonly scheduledBytes: number;
  /** Chunk waiting for its slot. */
  readonly chunk: ArrayBuffer;
}

/** Chunk paired with the scan seed, which never reaches a subscriber. */
const NO_CHUNK = new ArrayBuffer(0);

/**
 * Tells whether a byte ceiling can pace a stream at all.
 * @param bytesPerSecond Candidate ceiling.
 * @returns True when the ceiling is a positive, finite number.
 */
const isUsableCeiling = (bytesPerSecond: number): boolean =>
  Number.isFinite(bytesPerSecond) && bytesPerSecond > 0;

/**
 * Spreads a byte stream so its running average stays under a throughput ceiling.
 * Each chunk is held until the cumulative bytes sent, divided by the time since
 * subscription, fits the ceiling. The clock starts when the stream is
 * subscribed, which for a transfer is when the first bytes are ready.
 * @param bytesPerSecond Ceiling the stream stays at or under.
 * @param scheduler Clock that decides when each chunk's slot arrives.
 * @returns Operator delaying each chunk until its slot, in source order.
 */
export const paceBytes = (
  bytesPerSecond: number,
  scheduler: SchedulerLike = asyncScheduler,
): MonoTypeOperatorFunction<ArrayBuffer> => {
  if (!isUsableCeiling(bytesPerSecond)) {
    throw new RangeError('paceBytes needs a positive, finite byte ceiling');
  }

  return (source) =>
    defer(() => {
      const subscribedAt = scheduler.now();
      return source.pipe(
        scan(
          (cursor, chunk): PacedChunk => ({
            scheduledBytes: cursor.scheduledBytes + chunk.byteLength,
            chunk,
          }),
          { scheduledBytes: 0, chunk: NO_CHUNK },
        ),
        concatMap(({ chunk, scheduledBytes }) => {
          const slotAt = subscribedAt + (scheduledBytes * MILLISECONDS_PER_SECOND) / bytesPerSecond;
          const wait = Math.max(0, slotAt - scheduler.now());
          return of(chunk).pipe(delay(wait, scheduler));
        }),
      );
    });
};
