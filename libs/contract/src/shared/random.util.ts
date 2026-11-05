/** The slice of Web Crypto the contract needs to draw random bytes. */
interface RandomSource {
  /** Fills the given array with cryptographically strong random values and returns it. */
  readonly getRandomValues: <T extends Uint8Array>(array: T) => T;
}

/**
 * Web Crypto read through `globalThis`, the one cast the contract needs: it compiles with `lib: ["es2023"]`, where the global carries no `crypto`, yet browsers, Workers, and Node 19+ provide it.
 */
const randomSource = (globalThis as unknown as { readonly crypto: RandomSource }).crypto;

/**
 * Draws cryptographically strong random bytes.
 * @param length Number of bytes to draw.
 * @returns The filled buffer, backed by its own ArrayBuffer.
 */
export const randomBytes = (length: number): Uint8Array<ArrayBuffer> =>
  randomSource.getRandomValues(new Uint8Array(length));

/**
 * Draws a uniformly distributed unsigned 32-bit integer.
 * @returns A value in the 0 to 4294967295 range.
 */
export const randomUint32 = (): number => new DataView(randomBytes(4).buffer).getUint32(0);
