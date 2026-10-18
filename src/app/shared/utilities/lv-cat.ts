import { concatBytes } from '@noble/curves/utils.js';

function encodeLeb128(value: number): Uint8Array {
  const out: number[] = [];
  let remaining = value;
  while (remaining >= 128) {
    out.push((remaining & 0x7f) | 0x80);
    remaining = Math.floor(remaining / 128);
  }
  out.push(remaining);
  return new Uint8Array(out);
}

export function prependLen(data: Uint8Array): Uint8Array {
  return concatBytes(encodeLeb128(data.length), data);
}

export function lvCat(...parts: Uint8Array[]): Uint8Array {
  return concatBytes(...parts.map(prependLen));
}
