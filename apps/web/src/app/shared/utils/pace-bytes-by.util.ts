import {
  asyncScheduler,
  concatMap,
  defer,
  delay,
  type MonoTypeOperatorFunction,
  type Observable,
  of,
  type SchedulerLike,
  scan,
  startWith,
  withLatestFrom,
} from 'rxjs';

/** Milliseconds in one second, used to turn the byte ceiling into a time budget. */
const MILLISECONDS_PER_SECOND = 1000;

/** One chunk and the bytes the schedule has accounted for once it is sent. */
interface PacedChunk {
  /** Bytes scheduled for sending, including this chunk. */
  readonly scheduledBytes: number;
  /** Chunk waiting for its slot. */
  readonly chunk: ArrayBuffer;
  /** Ceiling in force when the chunk arrived. */
  readonly ceiling: number;
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
 * Works out how long one chunk waits for its slot under a ceiling.
 * @param subscribedAt Scheduler time the stream was subscribed at.
 * @param scheduledBytes Bytes scheduled for sending, including this chunk.
 * @param ceiling Ceiling in force when the chunk arrived.
 * @param now Scheduler time the wait is measured from.
 * @returns Milliseconds to hold the chunk, or zero when the ceiling cannot pace.
 */
const waitFor = (
  subscribedAt: number,
  scheduledBytes: number,
  ceiling: number,
  now: number,
): number => {
  if (!isUsableCeiling(ceiling)) return 0;
  const slotAt = subscribedAt + (scheduledBytes * MILLISECONDS_PER_SECOND) / ceiling;
  return Math.max(0, slotAt - now);
};

/**
 * Spreads a byte stream so its running average stays under a live ceiling.
 * Each chunk is held until the cumulative bytes sent, divided by the time since
 * subscription, fits the ceiling in force when the chunk arrived. The clock
 * starts when the stream is subscribed, which for a transfer is when the first
 * bytes are ready.
 * @param ceiling$ Ceiling the stream stays at or under, re-read per chunk.
 * @param scheduler Clock that decides when each chunk's slot arrives.
 * @returns Operator delaying each chunk until its slot, in source order.
 */
export const paceBytesBy =
  (
    ceiling$: Observable<number>,
    scheduler: SchedulerLike = asyncScheduler,
  ): MonoTypeOperatorFunction<ArrayBuffer> =>
  (source) =>
    defer(() => {
      const subscribedAt = scheduler.now();
      return source.pipe(
        withLatestFrom(ceiling$.pipe(startWith(Number.POSITIVE_INFINITY))),
        scan(
          (cursor, [chunk, ceiling]): PacedChunk => ({
            scheduledBytes: cursor.scheduledBytes + chunk.byteLength,
            chunk,
            ceiling,
          }),
          { scheduledBytes: 0, chunk: NO_CHUNK, ceiling: Number.POSITIVE_INFINITY },
        ),
        concatMap(({ chunk, scheduledBytes, ceiling }) =>
          of(chunk).pipe(
            delay(waitFor(subscribedAt, scheduledBytes, ceiling, scheduler.now()), scheduler),
          ),
        ),
      );
    });
