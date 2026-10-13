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

export const selectHashStatus = createSelector(
  selectSendState,
  (state) => state.hashStatus
);

export const selectHashProgress = createSelector(
  selectSendState,
  (state) => state.hashProgress
);

export const selectHashDigest = createSelector(
  selectSendState,
  (state) => state.hashDigest
);

export const selectHashError = createSelector(
  selectSendState,
  (state) => state.hashError
);
