import * as Option from 'effect/Option';
import * as Result from 'effect/Result';
import * as Schema from 'effect/Schema';
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { base64UrlBytes } from './base64url-bytes.model';
import { decodeSid, Sid } from './sid.model';

const Bytes = Schema.Uint8ArrayFromBase64Url;

/**
 * Encodes bytes to their unpadded base64url wire form.
 * @param bytes Bytes to encode.
 * @returns The base64url string.
 */
const encodeBytes = (bytes: Uint8Array): string => Schema.encodeSync(Bytes)(bytes);

describe('Sid', () => {
  describe('success', () => {
    it('accepts a 16-byte base64url string', () => {
      const value = 'AAAAAAAAAAAAAAAAAAAAAA';

      const result = Schema.decodeUnknownResult(Sid)(value);

      expect(result).toEqual(Result.succeed(value));
    });

    it('returns Some from decodeSid for a valid sid', () => {
      const value = encodeBytes(new Uint8Array(16));

      expect(decodeSid(value)).toEqual(Option.some(value));
    });

    it('returns None from decodeSid for garbage', () => {
      expect(decodeSid('not base64url!!')).toEqual(Option.none());
    });
  });

  describe('invariants', () => {
    it('rejects any base64url string that decodes to bytes other than 16', () => {
      fc.assert(
        fc.property(
          fc.uint8Array({ maxLength: 64 }).filter((bytes) => bytes.length !== 16),
          (bytes) => {
            const result = Schema.decodeUnknownResult(Sid)(encodeBytes(bytes));

            expect(Result.isFailure(result)).toBe(true);
          },
        ),
      );
    });

    it('rejects input that is not base64url', () => {
      fc.assert(
        fc.property(
          fc.string().map((value) => `${value}!`),
          (value) => {
            const result = Schema.decodeUnknownResult(Sid)(value);

            expect(Result.isFailure(result)).toBe(true);
          },
        ),
      );
    });

    it('returns None from decodeSid for a sid of the wrong length', () => {
      expect(decodeSid(encodeBytes(new Uint8Array(15)))).toEqual(Option.none());
      expect(decodeSid(encodeBytes(new Uint8Array(17)))).toEqual(Option.none());
    });
  });
});

describe('base64UrlBytes', () => {
  describe('success', () => {
    it('accepts exactly 32 bytes for the pake field', () => {
      fc.assert(
        fc.property(fc.uint8Array({ minLength: 32, maxLength: 32 }), (bytes) => {
          const value = encodeBytes(bytes);

          const result = Schema.decodeUnknownResult(base64UrlBytes(32, 'pake y'))(value);

          expect(result).toEqual(Result.succeed(value));
        }),
      );
    });
  });

  describe('invariants', () => {
    it('rejects any base64url string that decodes to bytes other than 32', () => {
      fc.assert(
        fc.property(
          fc.uint8Array({ maxLength: 64 }).filter((bytes) => bytes.length !== 32),
          (bytes) => {
            const result = Schema.decodeUnknownResult(base64UrlBytes(32, 'pake y'))(
              encodeBytes(bytes),
            );

            expect(Result.isFailure(result)).toBe(true);
          },
        ),
      );
    });

    it('rejects input that is not base64url', () => {
      fc.assert(
        fc.property(
          fc.string().map((value) => `${value}!`),
          (value) => {
            const result = Schema.decodeUnknownResult(base64UrlBytes(32, 'pake y'))(value);

            expect(Result.isFailure(result)).toBe(true);
          },
        ),
      );
    });
  });
});
