import * as Schema from 'effect/Schema';

/** Relay-level error codes sent to a peer. */
export const ErrorCode = Schema.Literals([
  'room-full',
  'room-expired',
  'protocol-mismatch',
  'peer-failed',
]);

/** A validated relay error code. */
export type ErrorCode = typeof ErrorCode.Type;
