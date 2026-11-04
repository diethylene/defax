import * as Option from 'effect/Option';
import * as Schema from 'effect/Schema';
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { RoomId, roomIdFromValue } from './room-id.model';

/** Decodes a candidate room code, yielding None when it is invalid. */
const decode = Schema.decodeUnknownOption(RoomId);

/** Generates every room code, which never starts with a zero. */
const roomCodes = fc.integer({ min: 100_000, max: 999_999 }).map(String);

describe('RoomId', () => {
  describe('success', () => {
    it('decodes a six-digit code', () => {
      expect(decode('123456')).toEqual(Option.some('123456'));
    });

    it('accepts every room code', () => {
      fc.assert(
        fc.property(roomCodes, (code) => {
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

    it('rejects a code with a leading zero', () => {
      expect(decode('012345')).toEqual(Option.none());
    });

    it('rejects input that is not a string', () => {
      expect(decode(123456)).toEqual(Option.none());
    });

    it('rejects every string that is not a room code', () => {
      fc.assert(
        fc.property(
          fc.string().filter((value) => !/^[1-9]\d{5}$/.test(value)),
          (value) => {
            expect(Option.isNone(decode(value))).toBe(true);
          },
        ),
      );
    });
  });
});

describe('roomIdFromValue', () => {
  describe('success', () => {
    it('maps the bottom of the draw range to the lowest room code', () => {
      expect(roomIdFromValue(0)).toBe('100000');
    });

    it('maps the top of the draw range to the highest room code', () => {
      expect(roomIdFromValue(899_999)).toBe('999999');
    });
  });

  describe('invariants', () => {
    it('returns a room code for any non-negative integer draw', () => {
      fc.assert(
        fc.property(fc.nat(), (value) => {
          expect(roomIdFromValue(value)).toMatch(/^[1-9]\d{5}$/);
        }),
      );
    });
  });
});
