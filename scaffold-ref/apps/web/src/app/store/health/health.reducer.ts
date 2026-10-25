import type { Health } from '@contract/health/health.model';
import { createFeature, createReducer, on } from '@ngrx/store';
import { HealthActions } from './health.actions';

/** Where the latest health check stands. */
export type HealthCheck =
  | { readonly _tag: 'Unchecked' }
  | { readonly _tag: 'Checking' }
  | { readonly _tag: 'Healthy'; readonly health: Health }
  | { readonly _tag: 'Unreachable' };

/** Health slice of the global store. */
export interface HealthState {
  /** The latest check. */
  readonly check: HealthCheck;
}

/** Slice state before the first check. */
export const initialHealthState: HealthState = { check: { _tag: 'Unchecked' } };

/** The health feature: reducer plus generated selectors. */
export const healthFeature = createFeature({
  name: 'health',
  reducer: createReducer(
    initialHealthState,
    on(HealthActions.checkRequested, (): HealthState => ({ check: { _tag: 'Checking' } })),
    on(
      HealthActions.checkSucceeded,
      (_, { health }): HealthState => ({
        check: { _tag: 'Healthy', health },
      }),
    ),
    on(HealthActions.checkFailed, (): HealthState => ({ check: { _tag: 'Unreachable' } })),
  ),
});
