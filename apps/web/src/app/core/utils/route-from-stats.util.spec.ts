import { describe, expect, it } from 'vitest';
import { routeFromStats } from './route-from-stats.util';

/** A selected candidate pair referencing one local and one remote candidate. */
const selectedPair = { id: 'pair-1', type: 'candidate-pair' };

/** A candidate of the given kind, referenced by a pair. */
const candidate = (id: string, type: string, candidateType: string) => ({
  id,
  type,
  candidateType,
});

/** Local and remote candidates of the given kinds. */
const candidates = (local: string, remote: string) => [
  candidate('local-1', 'local-candidate', local),
  candidate('remote-1', 'remote-candidate', remote),
];

/** A pair stat joining the local and remote candidates. */
const pair = (overrides: Record<string, unknown> = {}) => ({
  ...selectedPair,
  localCandidateId: 'local-1',
  remoteCandidateId: 'remote-1',
  selected: true,
  ...overrides,
});

describe('routeFromStats', () => {
  describe('success', () => {
    it('returns relay when the selected pair uses a relay local candidate', () => {
      const stats = [pair(), ...candidates('relay', 'host')];

      expect(routeFromStats(stats)).toBe('relay');
    });

    it('returns relay when the selected pair uses a relay remote candidate', () => {
      const stats = [pair(), ...candidates('host', 'relay')];

      expect(routeFromStats(stats)).toBe('relay');
    });

    it('returns direct when the selected pair uses direct candidates', () => {
      const stats = [pair(), ...candidates('host', 'srflx')];

      expect(routeFromStats(stats)).toBe('direct');
    });
  });

  describe('invariants', () => {
    it('accepts a nominated pair without a selected flag', () => {
      const stats = [
        pair({ selected: undefined, nominated: true }),
        ...candidates('relay', 'host'),
      ];

      expect(routeFromStats(stats)).toBe('relay');
    });

    it('prefers the selected pair over an earlier nominated one', () => {
      const stats = [
        pair({ id: 'pair-0', selected: undefined, nominated: true }),
        pair({ id: 'pair-1', localCandidateId: 'local-2', remoteCandidateId: 'remote-2' }),
        ...candidates('relay', 'host'),
        candidate('local-2', 'local-candidate', 'host'),
        candidate('remote-2', 'remote-candidate', 'host'),
      ];

      expect(routeFromStats(stats)).toBe('direct');
    });

    it('defaults to direct when no candidate pair exists', () => {
      expect(routeFromStats(candidates('relay', 'host'))).toBe('direct');
    });

    it('defaults to direct when the stats entries are malformed', () => {
      expect(routeFromStats([{ id: 1 }])).toBe('direct');
    });
  });
});
