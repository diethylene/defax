import { createReducer, on } from '@ngrx/store';
import { setMode, toggleMode } from '../actions/application-config.actions';

export type ThemeMode = 'light' | 'dark';

export const APPLICATION_CONFIG_FEATURE_KEY = 'applicationConfig';

export interface ApplicationConfigState {
  mode: ThemeMode;
}

export const initialApplicationConfigState: ApplicationConfigState = {
  mode: 'light'
};

export const applicationConfigReducer = createReducer(
  initialApplicationConfigState,
  on(setMode, (state, { mode }) => ({ ...state, mode })),
  on(toggleMode, (state) => ({
    ...state,
    mode: state.mode === 'light' ? 'dark' : 'light'
  }))
);
