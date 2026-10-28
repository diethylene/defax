import { parseFileMetadata } from './file-metadata';

const metadata = {
  name: 'photo.png',
  size: 2048,
  mime: 'image/png',
  extension: 'png',
  lastModified: 1_700_000_000_000,
};

describe('parseFileMetadata', () => {
  describe('success', () => {
    it('parses valid metadata from JSON', () => {
      expect(parseFileMetadata(JSON.stringify(metadata))).toEqual(metadata);
    });
  });

  describe('invariants', () => {
    it('throws on malformed JSON', () => {
      expect(() => parseFileMetadata('nope')).toThrow();
    });

    it('throws on an empty name', () => {
      expect(() => parseFileMetadata(JSON.stringify({ ...metadata, name: '' }))).toThrow();
    });

    it('throws on a negative size', () => {
      expect(() => parseFileMetadata(JSON.stringify({ ...metadata, size: -1 }))).toThrow();
    });
  });
});
