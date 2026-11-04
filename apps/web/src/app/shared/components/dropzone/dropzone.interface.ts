import type { DropzoneReason } from './dropzone.type';

/** One rejected file with every reason it failed. */
export interface RejectedFile {
  /** File that was rejected. */
  file: File;
  /** Reasons the file failed. */
  reasons: DropzoneReason[];
}

/** Outcome of one drop or picker selection. */
export interface DropzoneResult {
  /** Files accepted into the selection. */
  accepted: File[];
  /** Files left out of the selection. */
  rejected: RejectedFile[];
}

/** Files and directories pulled out of one data transfer. */
export interface ExtractedDrop {
  /** Files in the transfer. */
  files: File[];
  /** Directories in the transfer, represented by placeholder files. */
  directories: File[];
}
