/**
 * Extracts a message from an unknown error value.
 * @param error The thrown value to inspect.
 * @param fallback Message used when the value is not an Error.
 * @returns The error's own message, or the fallback.
 */
export const toErrorMessage = (error: unknown, fallback: string): string =>
  error instanceof Error ? error.message : fallback;
