import * as Option from 'effect/Option';
import * as Schema from 'effect/Schema';

const Bytes = Schema.Uint8ArrayFromBase64Url;

/**
 * Builds a schema for a base64url string that decodes to exactly the given
 * byte length.
 * @param length The exact number of decoded bytes.
 * @param label Field name for error messages.
 * @returns A string schema validated to that byte length.
 */
export const base64UrlBytes = (length: number, label: string) =>
  Schema.String.pipe(
    Schema.refine(
      (value): value is string =>
        Option.exists(Schema.decodeUnknownOption(Bytes)(value), (bytes) => bytes.length === length),
      { message: `${label} must be ${length} bytes as base64url` },
    ),
  );
