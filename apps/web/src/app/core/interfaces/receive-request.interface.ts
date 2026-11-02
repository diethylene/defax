import type { FileMetadata } from '@contract/signal/file-metadata.model';

/** Everything needed to receive one file. */
export interface ReceiveRequest {
  /** Metadata the sender announced. */
  readonly metadata: FileMetadata;
  /** Digest the sender announced, used to verify the file. */
  readonly digest: string;
}
