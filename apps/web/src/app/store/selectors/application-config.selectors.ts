import { createFeatureSelector, createSelector } from '@ngrx/store';
import {
  APPLICATION_CONFIG_FEATURE_KEY,
  type ApplicationConfigState
} from '../reducers/application-config.reducer';

export const selectApplicationConfigState =
  createFeatureSelector<ApplicationConfigState>(APPLICATION_CONFIG_FEATURE_KEY);

export const selectMode = createSelector(
  selectApplicationConfigState,
  (state) => state.mode
);
