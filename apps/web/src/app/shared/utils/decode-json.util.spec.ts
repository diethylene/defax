import * as Schema from 'effect/Schema';
import { describe, expect, it } from 'vitest';
import { decodeJson } from './decode-json.util';

/** Sample schema standing in for the contract models decoded on the wire. */
const Sample = Schema.Struct({
  name: Schema.NonEmptyString,
  size: Schema.Natural,
});

describe('decodeJson', () => {
  describe('success', () => {
    it('decodes valid JSON into the schema value', () => {
      const json = '{"name":"photo.png","size":2048}';

      expect(decodeJson(Sample, json)).toEqual({ name: 'photo.png', size: 2048 });
    });
  });

  describe('invariants', () => {
    it('throws on invalid JSON text', () => {
      expect(() => decodeJson(Sample, 'nope')).toThrow();
    });

    it('throws on JSON that fails the schema', () => {
      expect(() => decodeJson(Sample, '{"name":"","size":2048}')).toThrow();
    });
  });
});
