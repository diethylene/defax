import { asyncScheduler, type MonoTypeOperatorFunction, of, type SchedulerLike } from 'rxjs';
import { paceBytesBy } from './pace-bytes-by.util';

/**
 * Tells whether a byte ceiling can pace a stream at all.
 * @param bytesPerSecond Candidate ceiling.
 * @returns True when the ceiling is a positive, finite number.
 */
const isUsableCeiling = (bytesPerSecond: number): boolean =>
  Number.isFinite(bytesPerSecond) && bytesPerSecond > 0;

/**
 * Spreads a byte stream so its running average stays under a fixed throughput ceiling.
 * The clock starts when the stream is subscribed, which for a transfer is when
 * the first bytes are ready.
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

  return paceBytesBy(of(bytesPerSecond), scheduler);
};
