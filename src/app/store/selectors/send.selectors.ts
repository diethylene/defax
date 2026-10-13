import { createFeatureSelector, createSelector } from '@ngrx/store';
import { SEND_FEATURE_KEY, type SendState } from '../reducers/send.reducer';

export const selectSendState =
  createFeatureSelector<SendState>(SEND_FEATURE_KEY);

export const selectSendPhase = createSelector(
  selectSendState,
  (state) => state.phase
);

export const selectSendFile = createSelector(
  selectSendState,
  (state) => state.file
);

export const selectSendMetadata = createSelector(
  selectSendState,
  (state) => state.metadata
);
