import * as Schema from 'effect/Schema';

/** Metadata attached to every API response. */
export const ApiMeta = Schema.Struct({
  /** Correlation id echoed on the response. */
  requestId: Schema.String,
  /** When the response was produced, ISO 8601. */
  timestamp: Schema.String,
  /** Deployed API version. */
  apiVersion: Schema.NonEmptyString,
});

/** Validated response metadata. */
export type ApiMeta = typeof ApiMeta.Type;
