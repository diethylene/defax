import * as Option from 'effect/Option';
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { decodeRoomId, roomIdFromValue } from './room-id.model';

/** Generates every room code, which never starts with a zero. */
const roomCodes = fc.integer({ min: 100_000, max: 999_999 }).map(String);

describe('RoomId', () => {
  describe('success', () => {
    it('decodes a six-digit code', () => {
      expect(decodeRoomId('123456')).toEqual(Option.some('123456'));
    });

    it('accepts every room code', () => {
      fc.assert(
        fc.property(roomCodes, (code) => {
          expect(Option.isSome(decodeRoomId(code))).toBe(true);
        }),
      );
    });
  });

  describe('invariants', () => {
    it('rejects a code shorter than six digits', () => {
      expect(decodeRoomId('12345')).toEqual(Option.none());
    });

    it('rejects a code longer than six digits', () => {
      expect(decodeRoomId('1234567')).toEqual(Option.none());
    });

    it('rejects a code containing a non-digit', () => {
      expect(decodeRoomId('12a456')).toEqual(Option.none());
    });

    it('rejects a code with a leading zero', () => {
      expect(decodeRoomId('012345')).toEqual(Option.none());
    });

    it('rejects input that is not a string', () => {
      expect(decodeRoomId(123456)).toEqual(Option.none());
    });

    it('rejects every string that is not a room code', () => {
      fc.assert(
        fc.property(
          fc.string().filter((value) => !/^[1-9]\d{5}$/.test(value)),
          (value) => {
            expect(Option.isNone(decodeRoomId(value))).toBe(true);
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
