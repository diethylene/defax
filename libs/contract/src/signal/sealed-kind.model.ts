import * as Schema from 'effect/Schema';

/** Kinds of end-to-end encrypted payload carried inside a sealed message. */
export const SealedKind = Schema.Literals([
  'peer-info',
  'file',
  'disconnect',
  'file-hash',
  'accept',
  'rtc-offer',
  'rtc-answer',
  'rtc-ice',
  'verify-result',
]);

/** A validated sealed payload kind. */
export type SealedKind = typeof SealedKind.Type;
