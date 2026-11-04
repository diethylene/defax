import * as Option from 'effect/Option';
import * as Schema from 'effect/Schema';
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { RoomCreated } from './room-created.model';
import { sidFromBytes } from './sid.model';

/** A valid 16-byte session id. */
const SidValue = sidFromBytes(new Uint8Array(16));

/** Decodes a candidate creation body, yielding None when it is invalid. */
const decode = Schema.decodeUnknownOption(RoomCreated);

describe('RoomCreated', () => {
  describe('success', () => {
    it('decodes a room id and its sid', () => {
      expect(decode({ roomId: '123456', sid: SidValue })).toEqual(
        Option.some({ roomId: '123456', sid: SidValue }),
      );
    });

    it('accepts a sid built from any 16 bytes', () => {
      fc.assert(
        fc.property(fc.uint8Array({ minLength: 16, maxLength: 16 }), (bytes) => {
          const sid = sidFromBytes(bytes);

          expect(Option.isSome(decode({ roomId: '000000', sid }))).toBe(true);
        }),
      );
    });
  });

  describe('invariants', () => {
    it('rejects a room id that is not six digits', () => {
      expect(decode({ roomId: '12345', sid: SidValue })).toEqual(Option.none());
    });

    it('rejects a sid that is not 16 bytes', () => {
      expect(decode({ roomId: '123456', sid: 'AAAA' })).toEqual(Option.none());
    });

    it('rejects a body without a sid', () => {
      expect(decode({ roomId: '123456' })).toEqual(Option.none());
    });
  });
});
