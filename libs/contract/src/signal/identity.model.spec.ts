import * as Result from 'effect/Result';
import * as Schema from 'effect/Schema';
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { Identity } from './identity.model';

/** Valid identity; each test overrides only the field it is about. */
const anIdentity = {
  browser: 'Firefox',
  os: 'Linux',
  timeZone: 'Europe/Berlin',
  language: 'en',
};

const decode = Schema.decodeUnknownResult(Identity);

/** Field names of an identity, each sharing the same length bounds. */
const identityFields = fc.constantFrom('browser', 'os', 'timeZone', 'language');

describe('Identity', () => {
  describe('success', () => {
    it('decodes a valid identity', () => {
      expect(decode(anIdentity)).toEqual(Result.succeed(anIdentity));
    });

    it('round-trips a valid identity', () => {
      const encoded = Schema.encodeSync(Identity)(Schema.decodeSync(Identity)(anIdentity));

      expect(encoded).toEqual(anIdentity);
    });
  });

  describe('invariants', () => {
    it('accepts each field from 1 to 256 characters', () => {
      fc.assert(
        fc.property(identityFields, fc.string({ minLength: 1, maxLength: 256 }), (field, value) => {
          expect(Result.isSuccess(decode({ ...anIdentity, [field]: value }))).toBe(true);
        }),
      );
    });

    it('rejects an empty field', () => {
      fc.assert(
        fc.property(identityFields, (field) => {
          expect(Result.isFailure(decode({ ...anIdentity, [field]: '' }))).toBe(true);
        }),
      );
    });

    it('rejects a field over 256 characters', () => {
      fc.assert(
        fc.property(
          identityFields,
          fc.string({ minLength: 257, maxLength: 300 }),
          (field, value) => {
            expect(Result.isFailure(decode({ ...anIdentity, [field]: value }))).toBe(true);
          },
        ),
      );
    });
  });
});
