import { match } from 'ts-pattern';
import type { DropzoneConfig } from './dropzone.config';
import type {
  DropzoneReason,
  DropzoneResult,
  DropzoneValidator,
  RejectedFile
} from './dropzone.model';
import { matchesAccept } from './dropzone-accept';

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
  const candidates: File[] = [];
  const rejected: RejectedFile[] = [...directoryRejections];
  const seen = [...existing];

  for (const entry of entries) {
    const reasons = perFileRejectionReasons(entry, seen);
    if (reasons.length > 0) {
      rejected.push(toRejected(entry.file, reasons));
      continue;
    }
    candidates.push(entry.file);
    seen.push(entry.file);
  }

  return match(evaluateCapacity(candidates, existing, config))
    .with({ kind: 'ok' }, () => ({ accepted: candidates, rejected }))
    .with({ kind: 'reject' }, ({ reason }) => ({
      accepted: [],
      rejected: [
        ...directoryRejections,
        ...entries.map((entry) => toRejected(entry.file, [reason]))
      ]
    }))
    .exhaustive();
}

function perFileRejectionReasons(
  entry: RejectedFile,
  seen: File[]
): DropzoneReason[] {
  if (entry.reasons.length > 0) return entry.reasons;
  if (isDuplicate(entry.file, seen)) return ['duplicate'];
  return [];
}

type CapacityResult =
  | { kind: 'ok' }
  | { kind: 'reject'; reason: 'too-many-files' | 'total-size-exceeded' };

function evaluateCapacity(
  candidates: File[],
  existing: File[],
  config: DropzoneConfig
): CapacityResult {
  const remainingSlots =
    config.maxFiles === null ? Infinity : config.maxFiles - existing.length;
  if (candidates.length > remainingSlots) {
    return { kind: 'reject', reason: 'too-many-files' };
  }
  if (config.maxTotalSize !== null) {
    const totalSize =
      existing.reduce((sum, file) => sum + file.size, 0) +
      candidates.reduce((sum, file) => sum + file.size, 0);
    if (totalSize > config.maxTotalSize) {
      return { kind: 'reject', reason: 'total-size-exceeded' };
    }
  }
  return { kind: 'ok' };
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
