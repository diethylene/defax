import * as Result from 'effect/Result';
import * as Schema from 'effect/Schema';
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import {
  Accept,
  DisconnectNotice,
  FileHash,
  RtcAnswer,
  RtcIce,
  RtcOffer,
  VerifyResult,
} from './payload.model';

/** A valid RTC ice payload with every field set. */
const anIceCandidate = {
  candidate: 'candidate:1 1 UDP 2122252543 192.0.2.1 5000 typ host',
  sdpMid: '0',
  sdpMLineIndex: 0,
};

const decodeDisconnect = Schema.decodeUnknownResult(DisconnectNotice);
const decodeFileHash = Schema.decodeUnknownResult(FileHash);
const decodeAccept = Schema.decodeUnknownResult(Accept);
const decodeOffer = Schema.decodeUnknownResult(RtcOffer);
const decodeAnswer = Schema.decodeUnknownResult(RtcAnswer);
const decodeIce = Schema.decodeUnknownResult(RtcIce);
const decodeVerify = Schema.decodeUnknownResult(VerifyResult);

/** Drops one ice field to model a malformed wire value. */
const withoutIceField = (field: keyof typeof anIceCandidate) =>
  Object.fromEntries(Object.entries(anIceCandidate).filter(([key]) => key !== field));

describe('payloads', () => {
  describe('success', () => {
    it('decodes a disconnect notice for either side', () => {
      fc.assert(
        fc.property(fc.constantFrom('sender', 'receiver'), (cancelledBy) => {
          expect(decodeDisconnect({ cancelledBy })).toEqual(Result.succeed({ cancelledBy }));
        }),
      );
    });

    it('decodes a file hash with a digest', () => {
      expect(decodeFileHash({ digest: 'abc123' })).toEqual(Result.succeed({ digest: 'abc123' }));
    });

    it('decodes an empty accept payload', () => {
      expect(Result.isSuccess(decodeAccept({}))).toBe(true);
    });

    it('decodes RTC offers and answers with a non-empty sdp', () => {
      fc.assert(
        fc.property(fc.string({ minLength: 1, maxLength: 200 }), (sdp) => {
          expect(decodeOffer({ sdp })).toEqual(Result.succeed({ sdp }));
          expect(decodeAnswer({ sdp })).toEqual(Result.succeed({ sdp }));
        }),
      );
    });

    it('decodes RTC ice payloads with null and set fields', () => {
      const withNulls = { candidate: null, sdpMid: null, sdpMLineIndex: null };

      expect(decodeIce(withNulls)).toEqual(Result.succeed(withNulls));
      expect(decodeIce(anIceCandidate)).toEqual(Result.succeed(anIceCandidate));
    });

    it('decodes both verify result values', () => {
      expect(decodeVerify({ ok: true })).toEqual(Result.succeed({ ok: true }));
      expect(decodeVerify({ ok: false })).toEqual(Result.succeed({ ok: false }));
    });
  });

  describe('invariants', () => {
    it('rejects a disconnect side other than sender or receiver', () => {
      fc.assert(
        fc.property(
          fc.string().filter((side) => side !== 'sender' && side !== 'receiver'),
          (cancelledBy) => {
            expect(Result.isFailure(decodeDisconnect({ cancelledBy }))).toBe(true);
          },
        ),
      );
    });

    it('rejects an empty digest', () => {
      expect(Result.isFailure(decodeFileHash({ digest: '' }))).toBe(true);
    });

    it('rejects an empty sdp', () => {
      expect(Result.isFailure(decodeOffer({ sdp: '' }))).toBe(true);
      expect(Result.isFailure(decodeAnswer({ sdp: '' }))).toBe(true);
    });

    it('rejects a non-integer sdpMLineIndex', () => {
      fc.assert(
        fc.property(
          fc.integer().map((index) => index + 0.5),
          (sdpMLineIndex) => {
            expect(Result.isFailure(decodeIce({ ...anIceCandidate, sdpMLineIndex }))).toBe(true);
          },
        ),
      );
    });

    it('rejects an RTC ice payload missing a field', () => {
      fc.assert(
        fc.property(fc.constantFrom('candidate', 'sdpMid', 'sdpMLineIndex'), (field) => {
          expect(Result.isFailure(decodeIce(withoutIceField(field)))).toBe(true);
        }),
      );
    });

    it('rejects a non-boolean ok', () => {
      fc.assert(
        fc.property(fc.constantFrom(null, 0, 1, 'true', 'false'), (ok) => {
          expect(Result.isFailure(decodeVerify({ ok }))).toBe(true);
        }),
      );
    });
  });
});
