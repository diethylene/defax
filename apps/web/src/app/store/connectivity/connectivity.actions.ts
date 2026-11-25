import { createActionGroup, emptyProps, props } from '@ngrx/store';
import type { TransferRoute } from '@web/core/interfaces/transfer.interface';
import type { Readiness } from './connectivity-status.type';

/** Everything that can happen to the connectivity slice. */
export const ConnectivityActions = createActionGroup({
  source: 'Connectivity',
  events: {
    Check: emptyProps(),
    'Check Succeeded': props<{ readonly readiness: Readiness }>(),
    'Route Changed': props<{ readonly route: TransferRoute }>(),
    'Route Cleared': emptyProps(),
  },
});
