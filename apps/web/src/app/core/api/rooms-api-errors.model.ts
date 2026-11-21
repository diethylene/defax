import { ProblemDetails } from '@contract/http/problem-details.model';
import * as Data from 'effect/Data';

/** The API writes every failure as problem details, so that is the wire error body. */
export const RoomsWireError = ProblemDetails;

/** A decoded failure body returned by the rooms endpoint. */
export type RoomsWireError = typeof RoomsWireError.Type;

/** The request never produced a usable response (network down, timeout, or a body that failed decoding). */
export class RoomsRequestFailed extends Data.TaggedError('RoomsRequestFailed')<{
  /** Underlying failure, kept for logs. */
  readonly cause: unknown;
}> {}

/** Every expected failure of a room creation. */
export type RoomsApiError = RoomsWireError | RoomsRequestFailed;
