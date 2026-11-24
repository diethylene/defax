import { describe, expect, it } from 'vitest';
import { ConnectivityActions } from './connectivity.actions';
import {
  type ConnectivityState,
  connectivityFeature,
  initialConnectivityState,
} from './connectivity.reducer';

/**
 * Applies a list of actions onto a starting connectivity state.
 * @param state State to start from.
 * @param actions Actions to apply in order.
 * @returns The resulting state.
 */
const reduce = (
  state: ConnectivityState,
  ...actions: Parameters<typeof connectivityFeature.reducer>[1][]
): ConnectivityState => actions.reduce(connectivityFeature.reducer, state);

const routed: ConnectivityState = reduce(
  initialConnectivityState,
  ConnectivityActions.checkSucceeded({ readiness: { _tag: 'DirectPossible' } }),
  ConnectivityActions.routeChanged({ route: 'relay' }),
);

describe('connectivityFeature.reducer', () => {
  describe('success', () => {
    it('starts checking with no live route', () => {
      expect(initialConnectivityState).toEqual({
        readiness: { _tag: 'Checking' },
        liveRoute: undefined,
      });
    });

    it('stores the readiness a check succeeded carries', () => {
      const next = reduce(
        initialConnectivityState,
        ConnectivityActions.checkSucceeded({ readiness: { _tag: 'RelayRequired' } }),
      );

      expect(next.readiness).toEqual({ _tag: 'RelayRequired' });
    });

    it('returns to checking on check while keeping the live route', () => {
      const next = reduce(routed, ConnectivityActions.check());

      expect(next.readiness).toEqual({ _tag: 'Checking' });
      expect(next.liveRoute).toBe('relay');
    });

    it('stores the live route a route changed carries', () => {
      const next = reduce(
        initialConnectivityState,
        ConnectivityActions.routeChanged({ route: 'direct' }),
      );

      expect(next.liveRoute).toBe('direct');
    });

    it('clears the live route on route cleared', () => {
      const next = reduce(routed, ConnectivityActions.routeCleared());

      expect(next.liveRoute).toBeUndefined();
    });
  });

  describe('invariants', () => {
    it('keeps the readiness when the live route clears', () => {
      const next = reduce(routed, ConnectivityActions.routeCleared());

      expect(next.readiness).toEqual({ _tag: 'DirectPossible' });
    });

    it('keeps the state for an unrelated action', () => {
      const next = connectivityFeature.reducer(initialConnectivityState, {
        type: 'unrelated',
      });

      expect(next).toEqual(initialConnectivityState);
    });
  });
});
