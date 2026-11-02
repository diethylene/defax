/// <reference lib="webworker" />
import { sha256 } from '@noble/hashes/sha2.js';
import { bytesToHex } from '@noble/hashes/utils.js';
import type { FileHashRequest, FileHashWorkerMessage } from './hash-protocol';

/**
 * Extracts a message from an unknown error value.
 * @param error The thrown value to inspect.
 * @returns The error's own message, or a generic fallback.
 */
const toErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : 'File hashing failed';

/**
 * Hashes a file, emitting progress as chunks arrive and the digest at the end.
 * @param file File to hash.
 * @returns Progress events, then either the digest or a failure.
 */
// biome-ignore lint/plugin: a generator cannot be an arrow function
async function* streamHash(file: File): AsyncGenerator<FileHashWorkerMessage> {
  try {
    const hasher = sha256.create();
    const reader = file.stream().getReader();
    const total = file.size;
    // biome-ignore lint/plugin: the pull-based reader keeps its own running total
    let processed = 0;

    // The reader is pulled one chunk at a time, so the loop stays imperative.
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
