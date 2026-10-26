import * as Result from 'effect/Result';
import * as Schema from 'effect/Schema';
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { decodeInbound, OutboundMessage } from './message.model';

/** Encodes raw bytes into the base64url wire form the protocol expects. */
const encodeBase64Url = Schema.encodeSync(Schema.Uint8ArrayFromBase64Url);

/** A valid 32-byte PAKE public key. */
const PakeY = 'A'.repeat(43);

/** A valid 16-byte session id. */
const SidValue = 'A'.repeat(22);

/** Encodes a candidate message as JSON, the way it arrives off the wire. */
const wire = (message: unknown): string => JSON.stringify(message);

describe('decodeInbound', () => {
  describe('success', () => {
    it('decodes a join message', () => {
      const result = decodeInbound('{"type":"join","protocol":1}');

      expect(result).toEqual(Result.succeed({ type: 'join', protocol: 1 }));
    });

    it('decodes a pake message carrying a 32-byte y', () => {
      const result = decodeInbound(wire({ type: 'pake', y: PakeY }));

      expect(result).toEqual(Result.succeed({ type: 'pake', y: PakeY }));
    });

    it('decodes a sealed message with a known kind and non-empty ciphertext', () => {
      const result = decodeInbound(wire({ type: 'sealed', kind: 'rtc-offer', ct: 'abc' }));

      expect(result).toEqual(Result.succeed({ type: 'sealed', kind: 'rtc-offer', ct: 'abc' }));
    });
  });

  describe('invariants', () => {
    it('rejects an unknown type', () => {
      expect(Result.isFailure(decodeInbound(wire({ type: 'nope' })))).toBe(true);
    });

    it('rejects a protocol that is not a number', () => {
      expect(Result.isFailure(decodeInbound(wire({ type: 'join', protocol: '1' })))).toBe(true);
    });

    it('rejects a pake y that is not 32 bytes', () => {
      expect(Result.isFailure(decodeInbound(wire({ type: 'pake', y: SidValue })))).toBe(true);
    });

    it('rejects an unknown sealed kind', () => {
      expect(
        Result.isFailure(decodeInbound(wire({ type: 'sealed', kind: 'nope', ct: 'abc' }))),
      ).toBe(true);
    });

    it('rejects an empty ciphertext', () => {
      expect(
        Result.isFailure(decodeInbound(wire({ type: 'sealed', kind: 'rtc-offer', ct: '' }))),
      ).toBe(true);
    });

    it('accepts every 32-byte pake y', () => {
      fc.assert(
        fc.property(fc.uint8Array({ minLength: 32, maxLength: 32 }), (bytes) => {
          const result = decodeInbound(wire({ type: 'pake', y: encodeBase64Url(bytes) }));

          expect(Result.isSuccess(result)).toBe(true);
        }),
      );
    });

    it('rejects every pake y of another length', () => {
      fc.assert(
        fc.property(fc.uint8Array({ minLength: 0, maxLength: 64 }), (bytes) => {
          fc.pre(bytes.length !== 32);

          const result = decodeInbound(wire({ type: 'pake', y: encodeBase64Url(bytes) }));

          expect(Result.isFailure(result)).toBe(true);
        }),
      );
    });

    it('never throws on arbitrary input', () => {
      fc.assert(
        fc.property(fc.string(), (input) => {
          expect(Result.isResult(decodeInbound(input))).toBe(true);
        }),
      );
    });
  });
});

describe('OutboundMessage', () => {
  describe('success', () => {
    it('accepts a joined message with a 16-byte sid', () => {
      const result = Schema.decodeUnknownResult(OutboundMessage)({
        type: 'joined',
        sid: SidValue,
      });

      expect(result).toEqual(Result.succeed({ type: 'joined', sid: SidValue }));
    });

    it('accepts a peer-joined message', () => {
      const result = Schema.decodeUnknownResult(OutboundMessage)({ type: 'peer-joined' });

      expect(result).toEqual(Result.succeed({ type: 'peer-joined' }));
    });

    it('accepts an error message with a known code', () => {
      const result = Schema.decodeUnknownResult(OutboundMessage)({
        type: 'error',
        code: 'room-full',
      });

      expect(result).toEqual(Result.succeed({ type: 'error', code: 'room-full' }));
    });

    it('accepts a pake message', () => {
      const result = Schema.decodeUnknownResult(OutboundMessage)({ type: 'pake', y: PakeY });

      expect(result).toEqual(Result.succeed({ type: 'pake', y: PakeY }));
    });

    it('accepts a sealed message', () => {
      const result = Schema.decodeUnknownResult(OutboundMessage)({
        type: 'sealed',
        kind: 'file',
        ct: 'abc',
      });

      expect(result).toEqual(Result.succeed({ type: 'sealed', kind: 'file', ct: 'abc' }));
    });
  });

  describe('invariants', () => {
    it('rejects a sid that is not 16 bytes', () => {
      const result = Schema.decodeUnknownResult(OutboundMessage)({
        type: 'joined',
        sid: PakeY,
      });

      expect(Result.isFailure(result)).toBe(true);
    });

    it('rejects an unknown error code', () => {
      const result = Schema.decodeUnknownResult(OutboundMessage)({
        type: 'error',
        code: 'nope',
      });

      expect(Result.isFailure(result)).toBe(true);
    });

    it('rejects every sid of a length other than 16 bytes', () => {
      fc.assert(
        fc.property(fc.uint8Array({ minLength: 0, maxLength: 32 }), (bytes) => {
          fc.pre(bytes.length !== 16);

          const result = Schema.decodeUnknownResult(OutboundMessage)({
            type: 'joined',
            sid: encodeBase64Url(bytes),
          });

          expect(Result.isFailure(result)).toBe(true);
        }),
      );
    });
  });
});
