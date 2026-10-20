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

export const selectReceivePeerIdentity = createSelector(
  selectReceiveState,
  (state) => state.peerIdentity
);

export const selectReceiveFile = createSelector(
  selectReceiveState,
  (state) => state.file
);

export const selectReceiveDigest = createSelector(
  selectReceiveState,
  (state) => state.digest
);

export const selectReceiveError = createSelector(
  selectReceiveState,
  (state) => state.error
);

export const selectReceiveTransfer = createSelector(
  selectReceiveState,
  (state) => state.transfer
);

export const selectReceiveTransferReceived = createSelector(
  selectReceiveTransfer,
  (transfer) => transfer.received
);

export const selectReceiveTransferTotal = createSelector(
  selectReceiveTransfer,
  (transfer) => transfer.total
);

export const selectReceiveTransferRoute = createSelector(
  selectReceiveTransfer,
  (transfer) => transfer.route
);
