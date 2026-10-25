import * as Schema from 'effect/Schema';

/** Health report returned by the API and decoded by the web app. */
export const Health = Schema.Struct({
  /** Overall service state. */
  status: Schema.Literals(['ok']),
  /** Deployed API version. */
  version: Schema.NonEmptyString,
});

/** A validated health report. */
export type Health = typeof Health.Type;
