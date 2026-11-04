import * as Schema from 'effect/Schema';

/** RFC 7807 problem details, extended with request correlation fields. */
export const ProblemDetails = Schema.Struct({
  /** URI identifying the error type; `about:blank` when no catalog entry exists. */
  type: Schema.String,
  /** Short, human-readable summary of the problem. */
  title: Schema.NonEmptyString,
  /** HTTP status code of the response. */
  status: Schema.Int,
  /** Optional, human-readable specifics. */
  detail: Schema.optional(Schema.String),
  /** Correlation id echoed on the response. */
  requestId: Schema.String,
  /** When the response was produced, ISO 8601. */
  timestamp: Schema.String,
});

/** Validated problem details. */
export type ProblemDetails = typeof ProblemDetails.Type;
