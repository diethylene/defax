import * as Context from 'effect/Context';
import * as Schema from 'effect/Schema';

/** Per-endpoint override in requests per window. */
export const RateLimit = Context.Service<number>('RateLimit');

/** A consume call as the limiter's Durable Object reads it. */
export const ConsumeRequestSchema = Schema.Struct({
  /** Counter key: client identity plus endpoint identifier. */
  key: Schema.String,
  /** Requests allowed in the window. */
  limit: Schema.Int,
  /** Window length in milliseconds. */
  windowMs: Schema.Number,
});

/** Validated consume call. */
export type ConsumeRequest = typeof ConsumeRequestSchema.Type;

/** Outcome of consuming one token as the Durable Object writes it. */
export const ConsumeResultSchema = Schema.Struct({
  /** Whether the request may proceed. */
  allowed: Schema.Boolean,
  /** Tokens left in the window after this request. */
  remaining: Schema.Int,
  /** Milliseconds until the window resets. */
  resetAfterMs: Schema.Number,
});

/** Validated consume result. */
export type ConsumeResult = typeof ConsumeResultSchema.Type;
