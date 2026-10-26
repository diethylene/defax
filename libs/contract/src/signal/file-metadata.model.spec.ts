import * as Result from 'effect/Result';
import * as Schema from 'effect/Schema';
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { FileMetadata } from './file-metadata.model';

/** Valid file metadata; each test overrides only the field it is about. */
const aFileMetadata = {
  name: 'photo.png',
  size: 2_048,
  mime: 'image/png',
  extension: 'png',
  lastModified: 1_700_000_000_000,
};

const decode = Schema.decodeUnknownResult(FileMetadata);

describe('FileMetadata', () => {
  describe('success', () => {
    it('decodes valid metadata', () => {
      expect(decode(aFileMetadata)).toEqual(Result.succeed(aFileMetadata));
    });

    it('round-trips valid metadata', () => {
      const encoded = Schema.encodeSync(FileMetadata)(
        Schema.decodeSync(FileMetadata)(aFileMetadata),
      );

      expect(encoded).toEqual(aFileMetadata);
    });
  });

  describe('invariants', () => {
    it('accepts names from 1 to 1024 characters', () => {
      fc.assert(
        fc.property(fc.string({ minLength: 1, maxLength: 1024 }), (name) => {
          expect(Result.isSuccess(decode({ ...aFileMetadata, name }))).toBe(true);
        }),
      );
    });

    it('accepts a mime of 256 characters and an extension of 64 characters', () => {
      const metadata = {
        ...aFileMetadata,
        mime: 'a'.repeat(256),
        extension: 'b'.repeat(64),
      };

      expect(Result.isSuccess(decode(metadata))).toBe(true);
    });

    it('rejects an empty name', () => {
      expect(Result.isFailure(decode({ ...aFileMetadata, name: '' }))).toBe(true);
    });

    it('rejects a name over 1024 characters', () => {
      fc.assert(
        fc.property(fc.string({ minLength: 1025, maxLength: 1100 }), (name) => {
          expect(Result.isFailure(decode({ ...aFileMetadata, name }))).toBe(true);
        }),
      );
    });

    it('rejects a negative size', () => {
      fc.assert(
        fc.property(fc.integer({ max: -1 }), (size) => {
          expect(Result.isFailure(decode({ ...aFileMetadata, size }))).toBe(true);
        }),
      );
    });

    it('rejects a non-integer size', () => {
      fc.assert(
        fc.property(
          fc.integer().map((size) => size + 0.5),
          (size) => {
            expect(Result.isFailure(decode({ ...aFileMetadata, size }))).toBe(true);
          },
        ),
      );
    });

    it('rejects a mime over 256 characters', () => {
      fc.assert(
        fc.property(fc.string({ minLength: 257, maxLength: 300 }), (mime) => {
          expect(Result.isFailure(decode({ ...aFileMetadata, mime }))).toBe(true);
        }),
      );
    });

    it('rejects an extension over 64 characters', () => {
      fc.assert(
        fc.property(fc.string({ minLength: 65, maxLength: 100 }), (extension) => {
          expect(Result.isFailure(decode({ ...aFileMetadata, extension }))).toBe(true);
        }),
      );
    });

    it('rejects a negative lastModified', () => {
      fc.assert(
        fc.property(fc.integer({ max: -1 }), (lastModified) => {
          expect(Result.isFailure(decode({ ...aFileMetadata, lastModified }))).toBe(true);
        }),
      );
    });
  });
});
