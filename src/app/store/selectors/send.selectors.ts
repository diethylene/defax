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

export const selectSendPassword = createSelector(
  selectSendState,
  (state) => state.password
);

export const selectSendSas = createSelector(
  selectSendState,
  (state) => state.sas
);

export const selectSendPeerIdentity = createSelector(
  selectSendState,
  (state) => state.peerIdentity
);

export const selectSendError = createSelector(
  selectSendState,
  (state) => state.error
);

export const selectSendRoomId = createSelector(
  selectSendState,
  (state) => state.roomId
);

export const selectSendHash = createSelector(
  selectSendState,
  (state) => state.hash
);

export const selectSendHashStatus = createSelector(
  selectSendHash,
  (hash) => hash.status
);

export const selectSendHashProgress = createSelector(
  selectSendHash,
  (hash) => hash.progress
);

export const selectSendHashDigest = createSelector(
  selectSendHash,
  (hash) => hash.digest
);

export const selectSendHashError = createSelector(
  selectSendHash,
  (hash) => hash.error
);
