import * as Match from 'effect/Match';
import type { DropzoneConfig } from './dropzone.config';
import type {
  DropzoneReason,
  DropzoneResult,
  DropzoneValidator,
  RejectedFile,
} from './dropzone.model';
import { matchesAccept } from './dropzone-accept.util';

/**
 * Collects the reasons one file fails every per-file rule.
 * @param file File being checked.
 * @param config Resolved dropzone config.
 * @returns Reasons the file fails, empty when it passes.
 */
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

/**
 * Runs the caller's validator and normalizes its result to a list.
 * @param file File being checked.
 * @param validator Caller validator, when present.
 * @returns Reasons reported by the validator.
 */
function customReasons(file: File, validator: DropzoneValidator | null): DropzoneReason[] {
  const outcome = validator?.(file);
  if (!outcome) return [];
  return Array.isArray(outcome) ? outcome : [outcome];
}

/**
 * Tells whether a file is already in the selection.
 * @param file Candidate file.
 * @param seen Files already selected.
 * @returns True for a name, size, and modification time match.
 */
function isDuplicate(file: File, seen: File[]): boolean {
  return seen.some(
    (existing) =>
      existing.name === file.name &&
      existing.size === file.size &&
      existing.lastModified === file.lastModified,
  );
}

/**
 * Wraps a file and its reasons.
 * @param file Rejected file.
 * @param reasons Reasons it failed.
 * @returns Rejection record.
 */
function toRejected(file: File, reasons: DropzoneReason[]): RejectedFile {
  return { file, reasons };
}

/**
 * Evaluates one drop or picker selection.
 * @param incoming Files chosen in this interaction.
 * @param directories Directories dragged into the dropzone.
 * @param existing Files already selected.
 * @param config Resolved dropzone config.
 * @returns Accepted and rejected files.
 */
export function evaluateFiles(
  incoming: File[],
  directories: File[],
  existing: File[],
  config: DropzoneConfig,
): DropzoneResult {
  const entries = incoming.map((file) => toRejected(file, perFileReasons(file, config)));
  const directoryRejections = directories.map((file) => toRejected(file, ['directory']));
  return Match.value(config.rejectionMode).pipe(
    Match.when('all', () => evaluateAll(entries, directoryRejections, existing, config)),
    Match.when('partial', () => evaluatePartial(entries, directoryRejections, existing, config)),
    Match.exhaustive,
  );
}

/**
 * Accepts the files that pass and rejects the rest.
 * @param entries Incoming files with per-file reasons.
 * @param directoryRejections Directories to report.
 * @param existing Files already selected.
 * @param config Resolved dropzone config.
 * @returns Accepted and rejected files.
 */
function evaluatePartial(
  entries: RejectedFile[],
  directoryRejections: RejectedFile[],
  existing: File[],
  config: DropzoneConfig,
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

  return Match.value(evaluateCapacity(candidates, existing, config)).pipe(
    Match.when({ kind: 'ok' }, () => ({ accepted: candidates, rejected })),
    Match.when({ kind: 'reject' }, ({ reason }) => ({
      accepted: [],
      rejected: [
        ...directoryRejections,
        ...entries.map((entry) => toRejected(entry.file, [reason])),
      ],
    })),
    Match.exhaustive,
  );
}

/**
 * Combines per-file reasons with the duplicate check.
 * @param entry Incoming file with its per-file reasons.
 * @param seen Files already selected.
 * @returns Reasons that still apply.
 */
function perFileRejectionReasons(entry: RejectedFile, seen: File[]): DropzoneReason[] {
  if (entry.reasons.length > 0) return entry.reasons;
  if (isDuplicate(entry.file, seen)) return ['duplicate'];
  return [];
}

/** Result of the capacity check. */
type CapacityResult =
  | { kind: 'ok' }
  | { kind: 'reject'; reason: 'too-many-files' | 'total-size-exceeded' };

/**
 * Checks the file-count and total-size limits.
 * @param candidates Files that passed the per-file rules.
 * @param existing Files already selected.
 * @param config Resolved dropzone config.
 * @returns Whether the batch fits.
 */
function evaluateCapacity(
  candidates: File[],
  existing: File[],
  config: DropzoneConfig,
): CapacityResult {
  const remainingSlots = config.maxFiles === null ? Infinity : config.maxFiles - existing.length;
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

/**
 * Rejects the whole batch when any file fails.
 * @param entries Incoming files with per-file reasons.
 * @param directoryRejections Directories to report.
 * @param existing Files already selected.
 * @param config Resolved dropzone config.
 * @returns Accepted and rejected files.
 */
function evaluateAll(
  entries: RejectedFile[],
  directoryRejections: RejectedFile[],
  existing: File[],
  config: DropzoneConfig,
): DropzoneResult {
  const anyFailure =
    entries.some((entry) => entry.reasons.length > 0) || directoryRejections.length > 0;
  if (anyFailure) {
    return { accepted: [], rejected: [...directoryRejections, ...entries] };
  }
  const partial = evaluatePartial(entries, directoryRejections, existing, config);
  if (partial.rejected.length === 0) return partial;
  const batch = entries.map(
    (entry) =>
      partial.rejected.find((rejected) => rejected.file === entry.file) ??
      toRejected(entry.file, []),
  );
  return { accepted: [], rejected: [...directoryRejections, ...batch] };
}
