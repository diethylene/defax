export type DropzoneReason =
  | 'file-type'
  | 'file-too-large'
  | 'file-too-small'
  | 'too-many-files'
  | 'total-size-exceeded'
  | 'duplicate'
  | 'directory'
  | 'custom';

export type DropzoneValidator = (
  file: File
) => DropzoneReason | DropzoneReason[] | null;

export type DropzoneRejectionMode = 'all' | 'partial';

export interface RejectedFile {
  file: File;
  reasons: DropzoneReason[];
}

export interface DropzoneResult {
  accepted: File[];
  rejected: RejectedFile[];
}

export type DragState = null | 'valid' | 'invalid' | 'unknown';

export type DropzoneInteraction = 'idle' | 'drag-over' | 'picker-open';

export type DropzonePhase = DropzoneInteraction | 'disabled';
