/**
 * Normalizes an accept value into a trimmed, lower-case list.
 * @param accept Accept value as one string or a list.
 * @returns Normalized accept entries.
 */
export function normalizeAccept(
  accept: string | readonly string[]
): string[] {
  const raw = Array.isArray(accept) ? accept : [accept];
  return raw
    .flatMap((entry) => entry.split(','))
    .map((entry) => entry.trim().toLowerCase())
    .filter((entry) => entry.length > 0);
}

/**
 * Tells whether a MIME type matches the accept list.
 * @param type MIME type to test.
 * @param accept Normalized accept entries.
 * @returns True when the type is accepted.
 */
export function matchesMimeType(
  type: string,
  accept: readonly string[]
): boolean {
  if (accept.length === 0) return true;
  const normalized = type.toLowerCase();
  return accept.some((entry) => {
    if (entry.startsWith('.')) return false;
    if (entry.endsWith('/*')) {
      return normalized.startsWith(entry.slice(0, entry.length - 1));
    }
    return normalized === entry;
  });
}

/**
 * Tells whether a file matches the accept list by extension or MIME type.
 * @param file File to test.
 * @param accept Normalized accept entries.
 * @returns True when the file is accepted.
 */
export function matchesAccept(file: File, accept: readonly string[]): boolean {
  if (accept.length === 0) return true;
  const name = file.name.toLowerCase();
  if (accept.some((entry) => entry.startsWith('.') && name.endsWith(entry))) {
    return true;
  }
  return matchesMimeType(file.type, accept);
}
