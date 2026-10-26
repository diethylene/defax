import * as Result from 'effect/Result';
import * as Schema from 'effect/Schema';
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { Health } from './health.model';

describe('Health', () => {
  describe('success', () => {
    it('decodes a valid report', () => {
      const result = Schema.decodeUnknownResult(Health)({
        status: 'ok',
        version: '1.0.0',
      });

      expect(result).toEqual(Result.succeed({ status: 'ok', version: '1.0.0' }));
    });
  });

  describe('invariants', () => {
    it('rejects any status other than ok', () => {
      fc.assert(
        fc.property(
          fc.string().filter((status) => status !== 'ok'),
          (status) => {
            expect(
              Result.isFailure(Schema.decodeUnknownResult(Health)({ status, version: '1' })),
            ).toBe(true);
          },
        ),
      );
    });

    it('rejects an empty version', () => {
      expect(
        Result.isFailure(Schema.decodeUnknownResult(Health)({ status: 'ok', version: '' })),
      ).toBe(true);
    });
  });
});
