import { matchesAccept } from './dropzone.accept';
import type { DropzoneConfig } from './dropzone.config';
import type {
  DropzoneReason,
  DropzoneResult,
  RejectedFile
} from './dropzone.model';

function perFileReasons(file: File, config: DropzoneConfig): DropzoneReason[] {
  const reasons: DropzoneReason[] = [];
  if (!matchesAccept(file, config.accept)) reasons.push('file-type');
  if (config.maxFileSize !== null && file.size > config.maxFileSize) {
    reasons.push('file-too-large');
  }
  if (file.size < config.minFileSize) reasons.push('file-too-small');
  if (config.validator) {
    const outcome = config.validator(file);
    if (outcome) {
      reasons.push(...(Array.isArray(outcome) ? outcome : [outcome]));
    }
  }
  return reasons;
}

function isDuplicate(file: File, seen: File[]): boolean {
  return seen.some(
    (existing) =>
      existing.name === file.name &&
      existing.size === file.size &&
      existing.lastModified === file.lastModified
  );
}

function evaluatePartial(
  perFile: RejectedFile[],
  directories: RejectedFile[],
  existing: File[],
  config: DropzoneConfig
): DropzoneResult {
  const accepted: File[] = [];
  const rejected: RejectedFile[] = [...directories];
  const seen = [...existing];
  let totalSize = existing.reduce((sum, file) => sum + file.size, 0);

  for (const entry of perFile) {
    if (entry.reasons.length > 0) {
      rejected.push(entry);
      continue;
    }
    if (isDuplicate(entry.file, seen)) {
      rejected.push({ file: entry.file, reasons: ['duplicate'] });
      continue;
    }
    if (config.maxFiles !== null && seen.length >= config.maxFiles) {
      rejected.push({ file: entry.file, reasons: ['too-many-files'] });
      continue;
    }
    if (
      config.maxTotalSize !== null &&
      totalSize + entry.file.size > config.maxTotalSize
    ) {
      rejected.push({ file: entry.file, reasons: ['total-size-exceeded'] });
      continue;
    }
    accepted.push(entry.file);
    seen.push(entry.file);
    totalSize += entry.file.size;
  }

  return { accepted, rejected };
}

export function evaluateFiles(
  incoming: File[],
  directories: File[],
  existing: File[],
  config: DropzoneConfig
): DropzoneResult {
  const perFile: RejectedFile[] = incoming.map((file) => ({
    file,
    reasons: perFileReasons(file, config)
  }));
  const directoryRejections: RejectedFile[] = directories.map((file) => ({
    file,
    reasons: ['directory']
  }));

  const anyFailure =
    perFile.some((entry) => entry.reasons.length > 0) ||
    directoryRejections.length > 0;

  if (config.rejectionMode === 'all' && anyFailure) {
    return { accepted: [], rejected: [...directoryRejections, ...perFile] };
  }

  const result = evaluatePartial(
    perFile,
    directoryRejections,
    existing,
    config
  );

  if (config.rejectionMode === 'all' && result.rejected.length > 0) {
    const batch = incoming.map(
      (file) =>
        result.rejected.find((entry) => entry.file === file) ?? {
          file,
          reasons: [] as DropzoneReason[]
        }
    );
    return { accepted: [], rejected: [...directoryRejections, ...batch] };
  }

  return result;
}
