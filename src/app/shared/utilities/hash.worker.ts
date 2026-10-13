/// <reference lib="webworker" />
import { sha256 } from '@noble/hashes/sha2.js';
import { bytesToHex } from '@noble/hashes/utils.js';
import type {
  FileHashEvent,
  FileHashRequest,
  FileHashWorkerMessage
} from './hash-protocol';

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'File hashing failed';
}

function post(message: FileHashWorkerMessage): void {
  postMessage(message);
}

async function* streamHash(file: File): AsyncGenerator<FileHashEvent> {
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

async function run(file: File): Promise<void> {
  try {
    for await (const message of streamHash(file)) {
      post(message);
    }
  } catch (error) {
    post({ type: 'error', message: toErrorMessage(error) });
  }
}

addEventListener('message', (event: MessageEvent<FileHashRequest>) => {
  void run(event.data.file);
});
