import { concatBytes } from '@noble/curves/utils.js';

/**
 * Splits a non-negative integer into its base-128 digits.
 * @param value Number to split.
 * @returns The 7-bit groups, least significant first.
 */
const base128Digits = (value: number): readonly number[] =>
  value < 128
    ? [value]
    : [(value & 0x7f) | 0x80, ...base128Digits(Math.floor(value / 128))];

/**
 * Encodes a length as unsigned LEB128.
 * @param value Length to encode.
 * @returns The LEB128 bytes.
 */
const encodeLeb128 = (value: number): Uint8Array<ArrayBuffer> =>
  Uint8Array.from(base128Digits(value));

/**
 * Prefixes a buffer with its length.
 * @param data Bytes to prefix.
 * @returns The length-prefixed bytes.
 */
export const prependLen = (data: Uint8Array): Uint8Array<ArrayBuffer> =>
  concatBytes(encodeLeb128(data.length), data);

/**
 * Joins buffers, each prefixed with its length.
 * @param parts Buffers to join, in order.
 * @returns The concatenated length-prefixed bytes.
 */
export const lvCat = (...parts: Uint8Array[]): Uint8Array<ArrayBuffer> =>
  concatBytes(...parts.map(prependLen));
