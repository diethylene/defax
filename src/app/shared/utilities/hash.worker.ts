/// <reference lib="webworker" />
import { sha256 } from '@noble/hashes/sha2.js';
import { bytesToHex } from '@noble/hashes/utils.js';
import type { FileHashRequest, FileHashWorkerMessage } from './hash-protocol';

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'File hashing failed';
}

async function* streamHash(file: File): AsyncGenerator<FileHashWorkerMessage> {
  try {
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
  } catch (error) {
    yield { type: 'error', message: toErrorMessage(error) };
  }
}

addEventListener('message', async (event: MessageEvent<FileHashRequest>) => {
  for await (const message of streamHash(event.data.file)) {
    postMessage(message);
  }
});
