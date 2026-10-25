import type { Health } from '@contract/health/health.model';
import { createActionGroup, emptyProps, props } from '@ngrx/store';

/** Everything that can happen to the health slice. */
export const HealthActions = createActionGroup({
  source: 'Health',
  events: {
    'Check Requested': emptyProps(),
    'Check Succeeded': props<{ readonly health: Health }>(),
    'Check Failed': emptyProps(),
  },
});
