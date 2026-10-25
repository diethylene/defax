export function chunk(value: string, size: number): string[] {
  const groups: string[] = [];
  for (let i = 0; i < value.length; i += size) {
    groups.push(value.slice(i, i + size));
  }
  return groups;
}
