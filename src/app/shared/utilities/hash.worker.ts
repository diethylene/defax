/// <reference lib="webworker" />
import { sha256 } from '@noble/hashes/sha2.js';
import { bytesToHex } from '@noble/hashes/utils.js';
import type { FileHashRequest, FileHashWorkerMessage } from './hash-protocol';

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'File hashing failed';
}

function post(message: FileHashWorkerMessage): void {
  postMessage(message);
}

async function hashFile(file: File): Promise<void> {
  const hasher = sha256.create();
  const reader = file.stream().getReader();
  const total = file.size;
  let processed = 0;

  try {
    while (true) {
      const result = await reader.read();
      if (result.done) break;
      hasher.update(result.value);
      processed += result.value.byteLength;
      post({ type: 'progress', processed, total });
    }
    post({ type: 'complete', digest: bytesToHex(hasher.digest()) });
  } catch (error) {
    post({ type: 'error', message: toErrorMessage(error) });
  }
}

addEventListener('message', (event: MessageEvent<FileHashRequest>) => {
  void hashFile(event.data.file);
});
