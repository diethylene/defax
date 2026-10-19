import { createFeatureSelector, createSelector } from '@ngrx/store';
import {
  RECEIVE_FEATURE_KEY,
  type ReceiveState
} from '../reducers/receive.reducer';

export const selectReceiveState =
  createFeatureSelector<ReceiveState>(RECEIVE_FEATURE_KEY);

export const selectReceivePhase = createSelector(
  selectReceiveState,
  (state) => state.phase
);

export const selectReceiveCode = createSelector(
  selectReceiveState,
  (state) => state.code
);

export const selectReceiveSas = createSelector(
  selectReceiveState,
  (state) => state.sas
);

export const selectReceiveError = createSelector(
  selectReceiveState,
  (state) => state.error
);
