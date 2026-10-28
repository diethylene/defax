/** Why a file was rejected. */
export type DropzoneReason =
  | 'file-type'
  | 'file-too-large'
  | 'file-too-small'
  | 'too-many-files'
  | 'total-size-exceeded'
  | 'duplicate'
  | 'directory'
  | 'custom';

/** Extra file check supplied by the caller. */
export type DropzoneValidator = (file: File) => DropzoneReason | DropzoneReason[] | null;

/** How a batch with rejections is handled. */
export type DropzoneRejectionMode = 'all' | 'partial';

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

/** Drag state inferred from the dragged data transfer. */
export type DragState = null | 'valid' | 'invalid' | 'unknown';

/** Interaction the dropzone is in, before the disabled flag is applied. */
export type DropzoneInteraction = 'idle' | 'drag-over' | 'picker-open';

/** Interaction the dropzone is in, including the disabled state. */
export type DropzonePhase = DropzoneInteraction | 'disabled';
