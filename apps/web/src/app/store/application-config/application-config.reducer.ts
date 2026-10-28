import { createFeature, createReducer, on } from '@ngrx/store';
import { ApplicationConfigActions } from './application-config.actions';

/** Theme mode the app renders with. */
export type ThemeMode = 'light' | 'dark';

/** Application config slice of the global store. */
export interface ApplicationConfigState {
  /** Current theme mode. */
  readonly mode: ThemeMode;
}

/** Slice state before any mode is chosen. */
export const initialApplicationConfigState: ApplicationConfigState = { mode: 'light' };

/** The application config feature: reducer plus generated selectors. */
export const applicationConfigFeature = createFeature({
  name: 'applicationConfig',
  reducer: createReducer(
    initialApplicationConfigState,
    on(
      ApplicationConfigActions.setMode,
      (_, { mode }): ApplicationConfigState => ({ mode }),
    ),
    on(ApplicationConfigActions.toggleMode, (state): ApplicationConfigState => ({
      mode: state.mode === 'light' ? 'dark' : 'light',
    })),
  ),
});
