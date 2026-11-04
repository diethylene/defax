import * as Option from 'effect/Option';
import * as Schema from 'effect/Schema';
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { RoomId } from './room-id.model';

/** Decodes a candidate room code, yielding None when it is invalid. */
const decode = Schema.decodeUnknownOption(RoomId);

/** Generates every six-digit code, zero-padded. */
const sixDigits = fc
  .integer({ min: 0, max: 999_999 })
  .map((value) => value.toString().padStart(6, '0'));

describe('RoomId', () => {
  describe('success', () => {
    it('decodes a six-digit code', () => {
      expect(decode('123456')).toEqual(Option.some('123456'));
    });

    it('accepts every six-digit code', () => {
      fc.assert(
        fc.property(sixDigits, (code) => {
          expect(Option.isSome(decode(code))).toBe(true);
        }),
      );
    });
  });

  describe('invariants', () => {
    it('rejects a code shorter than six digits', () => {
      expect(decode('12345')).toEqual(Option.none());
    });

    it('rejects a code longer than six digits', () => {
      expect(decode('1234567')).toEqual(Option.none());
    });

    it('rejects a code containing a non-digit', () => {
      expect(decode('12a456')).toEqual(Option.none());
    });

    it('rejects input that is not a string', () => {
      expect(decode(123456)).toEqual(Option.none());
    });

    it('rejects every string that is not exactly six digits', () => {
      fc.assert(
        fc.property(
          fc.string().filter((value) => !/^\d{6}$/.test(value)),
          (value) => {
            expect(Option.isNone(decode(value))).toBe(true);
          },
        ),
      );
    });
  });
});
