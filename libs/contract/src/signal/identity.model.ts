import * as Schema from 'effect/Schema';

/** Text field shared by every identity property, 1 to 256 characters. */
const IdentityText = Schema.String.pipe(Schema.check(Schema.isBetweenLength(1, 256)));

/** Peer identity exchanged inside the sealed peer-info payload. */
export const Identity = Schema.Struct({
  /** Browser name and version. */
  browser: IdentityText,
  /** Operating system name. */
  os: IdentityText,
  /** IANA time zone of the peer. */
  timeZone: IdentityText,
  /** Preferred language tag of the peer. */
  language: IdentityText,
});

/** A validated peer identity. */
export type Identity = typeof Identity.Type;
