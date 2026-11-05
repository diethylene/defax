import * as Option from 'effect/Option';
import * as Schema from 'effect/Schema';
import { describe, expect, it } from 'vitest';
import { ProblemDetails } from './problem-details.model';

/** Valid problem details; each test overrides only the field it is about. */
const aProblem = {
  type: 'about:blank',
  title: 'Not Found',
  status: 404,
  detail: 'No room with that code.',
  requestId: '6f1c2a9e-0b7d-4a1e-9c3f-2d5b8e4a7c10',
  timestamp: '2026-11-04T10:00:00.000Z',
};

/** The same problem with the optional detail omitted. */
const withoutDetail = {
  type: aProblem.type,
  title: aProblem.title,
  status: aProblem.status,
  requestId: aProblem.requestId,
  timestamp: aProblem.timestamp,
};

/** Decodes candidate problem details, yielding None when they are invalid. */
const decode = Schema.decodeUnknownOption(ProblemDetails);

describe('ProblemDetails', () => {
  describe('success', () => {
    it('decodes a problem with a detail', () => {
      expect(decode(aProblem)).toEqual(Option.some(aProblem));
    });

    it('decodes a problem without a detail', () => {
      expect(decode(withoutDetail)).toEqual(Option.some(withoutDetail));
    });
  });

  describe('invariants', () => {
    it('rejects a problem without a title', () => {
      const { title: _, ...rest } = aProblem;

      expect(decode(rest)).toEqual(Option.none());
    });

    it('rejects a non-integer status', () => {
      expect(decode({ ...aProblem, status: 404.5 })).toEqual(Option.none());
    });

    it('rejects a status that is not a number', () => {
      expect(decode({ ...aProblem, status: '404' })).toEqual(Option.none());
    });
  });
});
