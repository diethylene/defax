/** Request posted to the worker with the file to hash. */
export interface FileHashRequest {
  /** File to hash. */
  file: File;
}

/** Progress event emitted while the worker reads the file. */
export interface FileHashProgress {
  /** Discriminant for a progress event. */
  type: 'progress';
  /** Bytes hashed so far. */
  processed: number;
  /** Total bytes in the file. */
  total: number;
}

/** Final event carrying the hex digest. */
export interface FileHashComplete {
  /** Discriminant for the complete event. */
  type: 'complete';
  /** Lowercase hex SHA-256 digest. */
  digest: string;
}

/** Event emitted while hashing a file. */
export type FileHashEvent = FileHashProgress | FileHashComplete;

/** Event reporting a failed hash. */
export interface FileHashFailure {
  /** Discriminant for the failure event. */
  type: 'error';
  /** Human-readable failure message. */
  message: string;
}

/** Every message the worker posts back. */
export type FileHashWorkerMessage = FileHashEvent | FileHashFailure;
