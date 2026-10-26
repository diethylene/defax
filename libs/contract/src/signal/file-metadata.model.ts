import * as Schema from 'effect/Schema';

/** File metadata exchanged inside the sealed file payload. */
export const FileMetadata = Schema.Struct({
  /** Display name of the file, 1 to 1024 characters. */
  name: Schema.String.pipe(Schema.check(Schema.isBetweenLength(1, 1024))),
  /** Size of the file in bytes, a non-negative integer. */
  size: Schema.Natural,
  /** MIME type of the file, at most 256 characters. */
  mime: Schema.String.pipe(Schema.check(Schema.isMaxLength(256))),
  /** File extension, at most 64 characters. */
  extension: Schema.String.pipe(Schema.check(Schema.isMaxLength(64))),
  /** Last modification time in epoch milliseconds, a non-negative integer. */
  lastModified: Schema.Natural,
});

/** A validated file metadata payload. */
export type FileMetadata = typeof FileMetadata.Type;
