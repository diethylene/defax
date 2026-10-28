import * as Effect from 'effect/Effect';
import * as Result from 'effect/Result';
import * as Schema from 'effect/Schema';
import type { DropzoneRejectionMode, DropzoneValidator } from './dropzone.model';
import { normalizeAccept } from './dropzone-accept.util';

/** Decodes a caller-supplied file validator. */
const Validator = Schema.declare<DropzoneValidator>(
  (input): input is DropzoneValidator => typeof input === 'function',
);

/** Raw config schema with validation and defaults. */
export const dropzoneConfigSchema = Schema.Struct({
  /** Accepted MIME types or extensions, before normalization. */
  accept: Schema.Union([Schema.String, Schema.Array(Schema.String)]).pipe(
    Schema.withDecodingDefault(Effect.succeed<string | readonly string[]>([])),
  ),
  /** Whether more than one file may be selected. */
  multiple: Schema.Boolean.pipe(Schema.withDecodingDefault(Effect.succeed(false))),
  /** Maximum number of files, or null for no limit. */
  maxFiles: Schema.NullOr(Schema.Int.pipe(Schema.check(Schema.isGreaterThanOrEqualTo(0)))).pipe(
    Schema.withDecodingDefault(Effect.succeed<number | null>(null)),
  ),
  /** Maximum size of one file in bytes, or null for no limit. */
  maxFileSize: Schema.NullOr(
    Schema.Finite.pipe(Schema.check(Schema.isGreaterThanOrEqualTo(0))),
  ).pipe(Schema.withDecodingDefault(Effect.succeed<number | null>(null))),
  /** Minimum size of one file in bytes. */
  minFileSize: Schema.Finite.pipe(Schema.check(Schema.isGreaterThanOrEqualTo(0))).pipe(
    Schema.withDecodingDefault(Effect.succeed(0)),
  ),
  /** Maximum total size in bytes, or null for no limit. */
  maxTotalSize: Schema.NullOr(
    Schema.Finite.pipe(Schema.check(Schema.isGreaterThanOrEqualTo(0))),
  ).pipe(Schema.withDecodingDefault(Effect.succeed<number | null>(null))),
  /** Caller-supplied per-file validator, or null. */
  validator: Schema.NullOr(Validator).pipe(
    Schema.withDecodingDefault(Effect.succeed<DropzoneValidator | null>(null)),
  ),
  /** Whether a batch with any rejection is rejected whole or partially. */
  rejectionMode: Schema.Literals(['all', 'partial']).pipe(
    Schema.withDecodingDefault(Effect.succeed<DropzoneRejectionMode>('partial')),
  ),
  /** Whether clicking the dropzone is ignored. */
  noClick: Schema.Boolean.pipe(Schema.withDecodingDefault(Effect.succeed(false))),
  /** Whether keyboard activation is ignored. */
  noKeyboard: Schema.Boolean.pipe(Schema.withDecodingDefault(Effect.succeed(false))),
  /** Whether the dropzone is disabled. */
  disabled: Schema.Boolean.pipe(Schema.withDecodingDefault(Effect.succeed(false))),
});

/** Raw decoded config, before the accept list is normalized. */
type RawDropzoneConfig = typeof dropzoneConfigSchema.Type;

/** Config accepted by {@link parseDropzoneConfig}. */
export type DropzoneConfigInput = typeof dropzoneConfigSchema.Encoded;

/** Fully resolved dropzone configuration. */
export interface DropzoneConfig {
  /** Normalized accepted MIME types and extensions. */
  readonly accept: readonly string[];
  /** Whether more than one file may be selected. */
  readonly multiple: boolean;
  /** Maximum number of files, or null for no limit. */
  readonly maxFiles: number | null;
  /** Maximum size of one file in bytes, or null for no limit. */
  readonly maxFileSize: number | null;
  /** Minimum size of one file in bytes. */
  readonly minFileSize: number;
  /** Maximum total size in bytes, or null for no limit. */
  readonly maxTotalSize: number | null;
  /** Caller-supplied per-file validator, or null. */
  readonly validator: DropzoneValidator | null;
  /** How a batch with rejections is handled. */
  readonly rejectionMode: DropzoneRejectionMode;
  /** Whether clicking the dropzone is ignored. */
  readonly noClick: boolean;
  /** Whether keyboard activation is ignored. */
  readonly noKeyboard: boolean;
  /** Whether the dropzone is disabled. */
  readonly disabled: boolean;
}

/**
 * Normalizes a decoded config.
 * @param raw Decoded config from the schema.
 * @returns Config with the accept list normalized.
 */
const toConfig = (raw: RawDropzoneConfig): DropzoneConfig => ({
  ...raw,
  accept: normalizeAccept(raw.accept),
});

/** Config used when the caller's input does not validate. */
const defaultConfig: DropzoneConfig = toConfig(Schema.decodeUnknownSync(dropzoneConfigSchema)({}));

/**
 * Parses caller input into a resolved dropzone config.
 * @param input Config values from the directive inputs.
 * @returns Resolved config, or the defaults when the input is invalid.
 */
export function parseDropzoneConfig(input: DropzoneConfigInput): DropzoneConfig {
  const result = Schema.decodeUnknownResult(dropzoneConfigSchema)(input);
  const config = Result.match({
    onSuccess: toConfig,
    onFailure: (error: Schema.SchemaError) => {
      console.error('[app-dropzone] invalid config:', error.message);
      return defaultConfig;
    },
  })(result);
  if (!config.multiple) {
    return { ...config, maxFiles: 1 };
  }
  return config;
}
