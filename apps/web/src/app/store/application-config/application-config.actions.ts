import { createActionGroup, emptyProps, props } from '@ngrx/store';
import type { ThemeMode } from './application-config.reducer';

/** Everything that can happen to the application config slice. */
export const ApplicationConfigActions = createActionGroup({
  source: 'Application Config',
  events: {
    'Set Mode': props<{ readonly mode: ThemeMode }>(),
    'Toggle Mode': emptyProps(),
  },
});
