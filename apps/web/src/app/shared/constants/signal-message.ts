export const SEALED_KINDS = [
  'peer-info',
  'file',
  'disconnect',
  'file-hash',
  'accept',
  'rtc-offer',
  'rtc-answer',
  'rtc-ice',
  'verify-result'
] as const;
export type SealedKind = (typeof SEALED_KINDS)[number];

export const ERROR_CODES = [
  'room-full',
  'room-expired',
  'protocol-mismatch',
  'peer-failed'
] as const;
export type ErrorCode = (typeof ERROR_CODES)[number];
