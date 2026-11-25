import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { readinessFromCandidates } from './readiness-from-candidates.util';

/** Candidate kinds a browser can gather. */
const candidateKinds = ['host', 'srflx', 'prflx', 'relay', ''] as const;

describe('readinessFromCandidates', () => {
  describe('success', () => {
    it('reports DirectPossible when a srflx candidate is present', () => {
      expect(readinessFromCandidates(['host', 'srflx'])).toEqual({ _tag: 'DirectPossible' });
    });

    it('reports RelayRequired when only a relay candidate is present', () => {
      expect(readinessFromCandidates(['host', 'relay'])).toEqual({ _tag: 'RelayRequired' });
    });

    it('reports Offline when only host candidates are present', () => {
      expect(readinessFromCandidates(['host'])).toEqual({ _tag: 'Offline' });
    });

    it('reports Offline when no candidates were gathered', () => {
      expect(readinessFromCandidates([])).toEqual({ _tag: 'Offline' });
    });
  });

  describe('invariants', () => {
    it('prefers DirectPossible over RelayRequired when both are gathered', () => {
      fc.assert(
        fc.property(fc.array(fc.constantFrom(...candidateKinds)), (others) => {
          expect(readinessFromCandidates([...others, 'relay', 'srflx'])).toEqual({
            _tag: 'DirectPossible',
          });
        }),
      );
    });

    it('reports DirectPossible for every set containing srflx', () => {
      fc.assert(
        fc.property(fc.array(fc.constantFrom(...candidateKinds)), (others) => {
          expect(readinessFromCandidates([...others, 'srflx'])).toEqual({
            _tag: 'DirectPossible',
          });
        }),
      );
    });

    it('reports RelayRequired for every relay set without srflx', () => {
      fc.assert(
        fc.property(fc.array(fc.constantFrom('host', 'prflx', '')), (others) => {
          expect(readinessFromCandidates([...others, 'relay'])).toEqual({ _tag: 'RelayRequired' });
        }),
      );
    });

    it('reports Offline for every set without srflx or relay', () => {
      fc.assert(
        fc.property(fc.array(fc.constantFrom('host', 'prflx', '')), (types) => {
          expect(readinessFromCandidates(types)).toEqual({ _tag: 'Offline' });
        }),
      );
    });

    it('never mutates the candidate types it was given', () => {
      fc.assert(
        fc.property(fc.array(fc.constantFrom(...candidateKinds)), (types) => {
          const before = [...types];

          readinessFromCandidates(types);

          expect(types).toEqual(before);
        }),
      );
    });
  });
});
