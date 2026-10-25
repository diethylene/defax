export function normalizeAccept(accept: string | string[]): string[] {
  const raw = Array.isArray(accept) ? accept : [accept];
  return raw
    .flatMap((entry) => entry.split(','))
    .map((entry) => entry.trim().toLowerCase())
    .filter((entry) => entry.length > 0);
}

export function matchesMimeType(type: string, accept: string[]): boolean {
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

export function matchesAccept(file: File, accept: string[]): boolean {
  if (accept.length === 0) return true;
  const name = file.name.toLowerCase();
  if (accept.some((entry) => entry.startsWith('.') && name.endsWith(entry))) {
    return true;
  }
  return matchesMimeType(file.type, accept);
}
