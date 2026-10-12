import { match } from 'ts-pattern';
import { matchesAccept } from './dropzone.accept';
import type { DropzoneConfig } from './dropzone.config';
import type {
  DropzoneReason,
  DropzoneResult,
  DropzoneValidator,
  RejectedFile
} from './dropzone.model';

function perFileReasons(file: File, config: DropzoneConfig): DropzoneReason[] {
  const reasons: DropzoneReason[] = [];
  if (!matchesAccept(file, config.accept)) reasons.push('file-type');
  if (config.maxFileSize !== null && file.size > config.maxFileSize) {
    reasons.push('file-too-large');
  }
  if (file.size < config.minFileSize) reasons.push('file-too-small');
  reasons.push(...customReasons(file, config.validator));
  return reasons;
}

function customReasons(
  file: File,
  validator: DropzoneValidator | null
): DropzoneReason[] {
  const outcome = validator?.(file);
  if (!outcome) return [];
  return Array.isArray(outcome) ? outcome : [outcome];
}

function isDuplicate(file: File, seen: File[]): boolean {
  return seen.some(
    (existing) =>
      existing.name === file.name &&
      existing.size === file.size &&
      existing.lastModified === file.lastModified
  );
}

function toRejected(file: File, reasons: DropzoneReason[]): RejectedFile {
  return { file, reasons };
}

export function evaluateFiles(
  incoming: File[],
  directories: File[],
  existing: File[],
  config: DropzoneConfig
): DropzoneResult {
  const entries = incoming.map((file) =>
    toRejected(file, perFileReasons(file, config))
  );
  const directoryRejections = directories.map((file) =>
    toRejected(file, ['directory'])
  );
  return match(config.rejectionMode)
    .with('all', () =>
      evaluateAll(entries, directoryRejections, existing, config)
    )
    .with('partial', () =>
      evaluatePartial(entries, directoryRejections, existing, config)
    )
    .exhaustive();
}

function evaluatePartial(
  entries: RejectedFile[],
  directoryRejections: RejectedFile[],
  existing: File[],
  config: DropzoneConfig
): DropzoneResult {
  const accepted: File[] = [];
  const rejected: RejectedFile[] = [...directoryRejections];
  const seen = [...existing];
  let totalSize = existing.reduce((sum, file) => sum + file.size, 0);

  for (const entry of entries) {
    const reasons = rejectionReasons(entry, seen, totalSize, config);
    if (reasons.length > 0) {
      rejected.push(toRejected(entry.file, reasons));
      continue;
    }
    accepted.push(entry.file);
    seen.push(entry.file);
    totalSize += entry.file.size;
  }
  return { accepted, rejected };
}

function rejectionReasons(
  entry: RejectedFile,
  seen: File[],
  totalSize: number,
  config: DropzoneConfig
): DropzoneReason[] {
  if (entry.reasons.length > 0) return entry.reasons;
  if (isDuplicate(entry.file, seen)) return ['duplicate'];
  if (config.maxFiles !== null && seen.length >= config.maxFiles) {
    return ['too-many-files'];
  }
  if (
    config.maxTotalSize !== null &&
    totalSize + entry.file.size > config.maxTotalSize
  ) {
    return ['total-size-exceeded'];
  }
  return [];
}

function evaluateAll(
  entries: RejectedFile[],
  directoryRejections: RejectedFile[],
  existing: File[],
  config: DropzoneConfig
): DropzoneResult {
  const anyFailure =
    entries.some((entry) => entry.reasons.length > 0) ||
    directoryRejections.length > 0;
  if (anyFailure) {
    return { accepted: [], rejected: [...directoryRejections, ...entries] };
  }
  const partial = evaluatePartial(
    entries,
    directoryRejections,
    existing,
    config
  );
  if (partial.rejected.length === 0) return partial;
  const batch = entries.map(
    (entry) =>
      partial.rejected.find((rejected) => rejected.file === entry.file) ??
      toRejected(entry.file, [])
  );
  return { accepted: [], rejected: [...directoryRejections, ...batch] };
}
