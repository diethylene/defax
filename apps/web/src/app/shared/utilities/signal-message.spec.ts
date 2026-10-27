import { encodeBase64Url } from './base64url';
import { parseSignalMessage } from './signal-message';

const sid = encodeBase64Url(new Uint8Array(16).fill(1));
const shortSid = encodeBase64Url(new Uint8Array(8).fill(1));
const pakeY = encodeBase64Url(new Uint8Array(32).fill(1));

describe('parseSignalMessage', () => {
  describe('success', () => {
    it('parses a join message', () => {
      expect(parseSignalMessage({ type: 'join', protocol: 1 })).toEqual({
        type: 'join',
        protocol: 1
      });
    });

    it('parses a pake message', () => {
      expect(parseSignalMessage({ type: 'pake', y: pakeY })).toEqual({
        type: 'pake',
        y: pakeY
      });
    });

    it('parses a sealed message', () => {
      expect(
        parseSignalMessage({ type: 'sealed', kind: 'peer-info', ct: 'abc' })
      ).toEqual({ type: 'sealed', kind: 'peer-info', ct: 'abc' });
    });

    it('parses a joined message', () => {
      expect(parseSignalMessage({ type: 'joined', sid })).toEqual({
        type: 'joined',
        sid
      });
    });

    it('parses a peer-joined message', () => {
      expect(parseSignalMessage({ type: 'peer-joined' })).toEqual({
        type: 'peer-joined'
      });
    });

    it('parses an error message', () => {
      expect(parseSignalMessage({ type: 'error', code: 'room-full' })).toEqual({
        type: 'error',
        code: 'room-full'
      });
    });
  });

  describe('invariants', () => {
    it('returns null for an unknown type', () => {
      expect(parseSignalMessage({ type: 'nope' })).toBeNull();
    });

    it('returns null for malformed input', () => {
      expect(parseSignalMessage('garbage')).toBeNull();
      expect(parseSignalMessage(null)).toBeNull();
    });

    it('returns null for a pake key that is not 32 bytes', () => {
      expect(parseSignalMessage({ type: 'pake', y: 'AAAA' })).toBeNull();
    });

    it('returns null for a wrong-length sid', () => {
      expect(parseSignalMessage({ type: 'joined', sid: shortSid })).toBeNull();
    });

    it('returns null for a bad sealed kind', () => {
      expect(
        parseSignalMessage({ type: 'sealed', kind: 'nope', ct: 'abc' })
      ).toBeNull();
    });

    it('returns null for a bad error code', () => {
      expect(parseSignalMessage({ type: 'error', code: 'nope' })).toBeNull();
    });
  });
});
