import * as Schema from 'effect/Schema';

/**
 * Parses a JSON wire payload with a schema, throwing when either the text or
 * the value is invalid.
 * @param schema Schema the decoded value must satisfy.
 * @param json JSON text received from the wire.
 * @returns The validated value.
 */
export const decodeJson = <S extends Schema.ConstraintDecoder<unknown>>(
  schema: S,
  json: string,
): S['Type'] => Schema.decodeUnknownSync(Schema.fromJsonString(schema))(json);
