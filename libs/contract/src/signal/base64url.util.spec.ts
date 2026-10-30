import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { decodeBase64Url, encodeBase64Url } from './base64url.util';

describe('encodeBase64Url', () => {
  describe('success', () => {
    it('encodes bytes as unpadded base64url', () => {
      expect(encodeBase64Url(new Uint8Array([0x66, 0x6f, 0x6f]))).toBe('Zm9v');
      expect(encodeBase64Url(new Uint8Array([255, 254, 253]))).toBe('__79');
    });

    it('encodes no bytes as an empty string', () => {
      expect(encodeBase64Url(new Uint8Array(0))).toBe('');
    });
  });
});

describe('decodeBase64Url', () => {
  describe('success', () => {
    it('decodes a known base64url vector', () => {
      expect(decodeBase64Url('AQID')).toEqual(new Uint8Array([1, 2, 3]));
    });

    it('decodes an empty string as no bytes', () => {
      expect(decodeBase64Url('')).toEqual(new Uint8Array(0));
    });
  });

  describe('invariants', () => {
    it('round-trips arbitrary bytes', () => {
      fc.assert(
        fc.property(fc.uint8Array(), (bytes) => {
          expect(decodeBase64Url(encodeBase64Url(bytes))).toEqual(bytes);
        }),
      );
    });

    it('returns an ArrayBuffer-backed array', () => {
      expect(decodeBase64Url('AQID').buffer).toBeInstanceOf(ArrayBuffer);
    });
  });
});
