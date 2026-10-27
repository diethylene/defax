import {
  parseAccept,
  parseRtcAnswer,
  parseRtcIce,
  parseRtcOffer,
  parseVerifyResult
} from './transfer-message';

describe('transfer message parsers', () => {
  describe('success', () => {
    it('parses an rtc offer', () => {
      expect(parseRtcOffer('{"sdp":"v=0"}')).toEqual({ sdp: 'v=0' });
    });

    it('parses an rtc answer', () => {
      expect(parseRtcAnswer('{"sdp":"v=0"}')).toEqual({ sdp: 'v=0' });
    });

    it('parses an rtc ice candidate with null fields', () => {
      expect(
        parseRtcIce('{"candidate":null,"sdpMid":null,"sdpMLineIndex":null}')
      ).toEqual({ candidate: null, sdpMid: null, sdpMLineIndex: null });
    });

    it('parses an accept payload', () => {
      expect(parseAccept('{}')).toEqual({});
    });

    it('parses a verify result', () => {
      expect(parseVerifyResult('{"ok":true}')).toEqual({ ok: true });
    });
  });

  describe('invariants', () => {
    it('throws on an empty sdp', () => {
      expect(() => parseRtcOffer('{"sdp":""}')).toThrow();
    });

    it('throws on a non-integer sdpMLineIndex', () => {
      expect(() =>
        parseRtcIce('{"candidate":null,"sdpMid":null,"sdpMLineIndex":1.5}')
      ).toThrow();
    });

    it('throws on malformed JSON', () => {
      expect(() => parseAccept('nope')).toThrow();
    });
  });
});
