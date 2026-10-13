/// <reference lib="webworker" />
import { type FileHashWorkerMessage, hashFile } from './hash-file';

interface FileHashRequest {
  file: File;
}

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'File hashing failed';
}

async function run(file: File): Promise<void> {
  try {
    for await (const message of hashFile(file)) {
      postMessage(message);
    }
  } catch (error) {
    postMessage({
      type: 'error',
      message: toErrorMessage(error)
    } satisfies FileHashWorkerMessage);
  }
}

addEventListener('message', (event: MessageEvent<FileHashRequest>) => {
  void run(event.data.file);
});
