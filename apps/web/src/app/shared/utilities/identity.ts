import * as Schema from 'effect/Schema';
import { Identity } from '@contract/signal/identity.model';

/** JSON decoder for peer identity. */
const identityFromJson = Schema.fromJsonString(Identity);

/**
 * Parses peer identity from its JSON wire form.
 * @param json The JSON text holding the identity.
 * @returns The validated identity.
 */
export const parseIdentity = (json: string): Identity =>
  Schema.decodeUnknownSync(identityFromJson)(json);
