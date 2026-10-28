import { parseIdentity } from './identity';

const identity = {
  browser: 'Firefox 142',
  os: 'Linux',
  timeZone: 'Europe/Berlin',
  language: 'en-US',
};

describe('parseIdentity', () => {
  describe('success', () => {
    it('parses valid identity from JSON', () => {
      expect(parseIdentity(JSON.stringify(identity))).toEqual(identity);
    });
  });

  describe('invariants', () => {
    it('throws on malformed JSON', () => {
      expect(() => parseIdentity('nope')).toThrow();
    });

    it('throws on an empty browser', () => {
      expect(() => parseIdentity(JSON.stringify({ ...identity, browser: '' }))).toThrow();
    });

    it('throws when a field is missing', () => {
      expect(() => parseIdentity(JSON.stringify({ browser: 'Firefox 142' }))).toThrow();
    });
  });
});
