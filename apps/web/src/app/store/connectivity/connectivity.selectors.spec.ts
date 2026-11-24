import { describe, expect, it } from 'vitest';
import { selectStatus, statusForRoute } from './connectivity.selectors';
import type { Readiness } from './connectivity-status.type';

const readiness: Readiness = { _tag: 'DirectPossible' };

describe('selectStatus', () => {
  describe('success', () => {
    it('shows Direct when a direct route is live', () => {
      expect(selectStatus.projector(readiness, 'direct')).toEqual({ _tag: 'Direct' });
    });

    it('shows Relay when a relay route is live', () => {
      expect(selectStatus.projector(readiness, 'relay')).toEqual({ _tag: 'Relay' });
    });

    it('shows the readiness when no route is live', () => {
      expect(selectStatus.projector(readiness, undefined)).toEqual({ _tag: 'DirectPossible' });
    });
  });

  describe('invariants', () => {
    it('has a live status for every transfer route', () => {
      expect(Object.keys(statusForRoute).sort()).toEqual(['direct', 'relay']);
    });
  });
});
