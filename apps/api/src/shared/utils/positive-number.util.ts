/**
 * Parses a configured number, falling back when it is absent or not positive.
 * @param value Candidate value from configuration.
 * @param fallback Value to use when the candidate is absent or invalid.
 * @returns The parsed positive number, or the fallback.
 */
export const positiveNumber = (value: string | number | undefined, fallback: number): number => {
  if (value === undefined) return fallback;
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};
