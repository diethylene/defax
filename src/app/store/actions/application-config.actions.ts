import { createAction, props } from '@ngrx/store';
import type { ThemeMode } from '../reducers/application-config.reducer';

export const setMode = createAction(
  '[Application Config] Set Mode',
  props<{ mode: ThemeMode }>()
);

export const toggleMode = createAction('[Application Config] Toggle Mode');
