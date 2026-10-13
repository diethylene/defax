import { sha256 } from '@noble/hashes/sha2.js';
import { bytesToHex } from '@noble/hashes/utils.js';

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

export async function* hashFile(file: File): AsyncGenerator<FileHashEvent> {
  const hasher = sha256.create();
  const reader = file.stream().getReader();
  const total = file.size;
  let processed = 0;

  while (true) {
    const result = await reader.read();
    if (result.done) break;
    hasher.update(result.value);
    processed += result.value.byteLength;
    yield { type: 'progress', processed, total };
  }

  yield { type: 'complete', digest: bytesToHex(hasher.digest()) };
}
