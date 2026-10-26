import * as Data from 'effect/Data';

/** The health request never produced a usable response (network down, timeout, or an unexpected body). */
export class HealthRequestFailed extends Data.TaggedError('HealthRequestFailed')<{
  /** Underlying failure, kept for logs. */
  readonly cause: unknown;
}> {}
