import { FileMetadata } from '@contract/signal/file-metadata.model';
import * as Schema from 'effect/Schema';

/** JSON decoder for file metadata. */
const fileMetadataFromJson = Schema.fromJsonString(FileMetadata);

/**
 * Parses file metadata from its JSON wire form.
 * @param json The JSON text holding the metadata.
 * @returns The validated metadata.
 */
export const parseFileMetadata = (json: string): FileMetadata =>
  Schema.decodeUnknownSync(fileMetadataFromJson)(json);
