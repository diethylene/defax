import { describe, expect, it } from 'vitest';
import { HealthActions } from './health.actions';
import { healthFeature, initialHealthState } from './health.reducer';

describe('healthFeature.reducer', () => {
  describe('success', () => {
    it('moves from Checking to Healthy', () => {
      const checking = healthFeature.reducer(initialHealthState, HealthActions.checkRequested());

      const next = healthFeature.reducer(
        checking,
        HealthActions.checkSucceeded({
          health: { status: 'ok', version: '1.0.0' },
        }),
      );

      expect(next).toEqual({
        check: { _tag: 'Healthy', health: { status: 'ok', version: '1.0.0' } },
      });
    });
  });

  describe('invariants', () => {
    it('drops a previous report when a check fails', () => {
      const healthy = healthFeature.reducer(
        initialHealthState,
        HealthActions.checkSucceeded({
          health: { status: 'ok', version: '1.0.0' },
        }),
      );

      expect(healthFeature.reducer(healthy, HealthActions.checkFailed())).toEqual({
        check: { _tag: 'Unreachable' },
      });
    });
  });
});
