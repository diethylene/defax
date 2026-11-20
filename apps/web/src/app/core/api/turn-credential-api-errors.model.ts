import { ProblemDetails } from '@contract/http/problem-details.model';
import * as Data from 'effect/Data';

/** The API writes every failure as problem details, so that is the wire error body. */
export const TurnCredentialWireError = ProblemDetails;

/** A decoded failure body returned by the credential endpoint. */
export type TurnCredentialWireError = typeof TurnCredentialWireError.Type;

/** The request never produced a usable response (network down, timeout, or a body that failed decoding). */
export class TurnCredentialRequestFailed extends Data.TaggedError('TurnCredentialRequestFailed')<{
  /** Underlying failure, kept for logs. */
  readonly cause: unknown;
}> {}

/** Every expected failure of a credential mint. */
export type TurnCredentialApiError = TurnCredentialWireError | TurnCredentialRequestFailed;
