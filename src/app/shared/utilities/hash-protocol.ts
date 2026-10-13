export interface FileHashRequest {
  file: File;
}

export interface FileHashProgress {
  type: 'progress';
  processed: number;
  total: number;
}

export interface FileHashComplete {
  type: 'complete';
  digest: string;
}

export type FileHashEvent = FileHashProgress | FileHashComplete;

export interface FileHashFailure {
  type: 'error';
  message: string;
}

export type FileHashWorkerMessage = FileHashEvent | FileHashFailure;
