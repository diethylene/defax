import * as Result from 'effect/Result';
import * as Schema from 'effect/Schema';
import type { DropzoneRejectionMode, DropzoneValidator } from './dropzone.model';
import { normalizeAccept } from './dropzone-accept.util';

/** Decodes a caller-supplied file validator. */
const Validator = Schema.declare<DropzoneValidator>(
  (input): input is DropzoneValidator => typeof input === 'function',
);

/** Raw config schema with validation; every field is optional and defaults below. */
export const dropzoneConfigSchema = Schema.Struct({
  /** Accepted MIME types or extensions, before normalization. */
  accept: Schema.optional(Schema.Union([Schema.String, Schema.Array(Schema.String)])),
  /** Whether more than one file may be selected. */
  multiple: Schema.optional(Schema.Boolean),
  /** Maximum number of files, or null for no limit. */
  maxFiles: Schema.optional(
    Schema.NullOr(Schema.Int.pipe(Schema.check(Schema.isGreaterThanOrEqualTo(0)))),
  ),
  /** Maximum size of one file in bytes, or null for no limit. */
  maxFileSize: Schema.optional(
    Schema.NullOr(Schema.Finite.pipe(Schema.check(Schema.isGreaterThanOrEqualTo(0)))),
  ),
  /** Minimum size of one file in bytes. */
  minFileSize: Schema.optional(Schema.Finite.pipe(Schema.check(Schema.isGreaterThanOrEqualTo(0)))),
  /** Maximum total size in bytes, or null for no limit. */
  maxTotalSize: Schema.optional(
    Schema.NullOr(Schema.Finite.pipe(Schema.check(Schema.isGreaterThanOrEqualTo(0)))),
  ),
  /** Caller-supplied per-file validator, or null. */
  validator: Schema.optional(Schema.NullOr(Validator)),
  /** Whether a batch with any rejection is rejected whole or partially. */
  rejectionMode: Schema.optional(Schema.Literals(['all', 'partial'])),
  /** Whether clicking the dropzone is ignored. */
  noClick: Schema.optional(Schema.Boolean),
  /** Whether keyboard activation is ignored. */
  noKeyboard: Schema.optional(Schema.Boolean),
  /** Whether the dropzone is disabled. */
  disabled: Schema.optional(Schema.Boolean),
});

/** Raw decoded config, with absent fields still unset. */
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
 * Fills the absent fields and normalizes the accept list.
 * @param raw Decoded config from the schema.
 * @returns Config with every field resolved.
 */
const toConfig = (raw: RawDropzoneConfig): DropzoneConfig => ({
  accept: normalizeAccept(raw.accept ?? []),
  multiple: raw.multiple ?? false,
  maxFiles: raw.maxFiles ?? null,
  maxFileSize: raw.maxFileSize ?? null,
  minFileSize: raw.minFileSize ?? 0,
  maxTotalSize: raw.maxTotalSize ?? null,
  validator: raw.validator ?? null,
  rejectionMode: raw.rejectionMode ?? 'partial',
  noClick: raw.noClick ?? false,
  noKeyboard: raw.noKeyboard ?? false,
  disabled: raw.disabled ?? false,
});

/** Config used when the caller's input does not validate. */
const defaultConfig: DropzoneConfig = toConfig(Schema.decodeUnknownSync(dropzoneConfigSchema)({}));

/**
 * Parses caller input into a resolved dropzone config.
 * @param input Config values from the directive inputs.
 * @returns Resolved config, or the defaults when the input is invalid.
 */
export const parseDropzoneConfig = (input: DropzoneConfigInput): DropzoneConfig => {
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
};
