/**
 * Splits a string into groups of a fixed size.
 * @param value Text to split.
 * @param size Maximum characters per group.
 * @returns The groups in order, the last one possibly shorter.
 */
export const chunk = (value: string, size: number): string[] =>
  Array.from({ length: Math.ceil(value.length / size) }, (_unused, index) =>
    value.slice(index * size, index * size + size),
  );
