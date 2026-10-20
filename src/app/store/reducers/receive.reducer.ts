import { createReducer, on } from '@ngrx/store';
import type { TransferRoute } from '../../core/interfaces/transfer.interface';
import type { ReceivePhase } from '../../features/receive/receive-phase/receive-phase';
import type { FileMetadata } from '../../shared/interfaces/file-metadata';
import type { Identity } from '../../shared/interfaces/identity';
import {
  receiveAccepted,
  receiveCodeEntered,
  receiveDigestReceived,
  receiveDisconnect,
  receiveHandshakeFailed,
  receiveReset,
  receiveSasComputed,
  receiveTransferComplete,
  receiveTransferFailed,
  receiveTransferProgress,
  receiveTransferStarted,
  receiveTransferVerified
} from '../actions/receive.actions';

export const RECEIVE_FEATURE_KEY = 'receive';

export interface ReceiveTransferState {
  received: number;
  total: number;
  route: TransferRoute | null;
  verified: boolean;
}

export interface ReceiveState {
  phase: ReceivePhase;
  code: string | null;
  sas: string | null;
  peerIdentity: Identity | null;
  file: FileMetadata | null;
  digest: string | null;
  error: string | null;
  transfer: ReceiveTransferState;
}

const initialTransferState: ReceiveTransferState = {
  received: 0,
  total: 0,
  route: null,
  verified: false
};

export const initialReceiveState: ReceiveState = {
  phase: 'idle',
  code: null,
  sas: null,
  peerIdentity: null,
  file: null,
  digest: null,
  error: null,
  transfer: initialTransferState
};

export const receiveReducer = createReducer(
  initialReceiveState,
  on(
    receiveCodeEntered,
    (_state, { code }): ReceiveState => ({
      phase: 'connecting',
      code,
      sas: null,
      peerIdentity: null,
      file: null,
      digest: null,
      error: null,
      transfer: initialTransferState
    })
  ),
  on(
    receiveSasComputed,
    (state, { sas, peerIdentity, file }): ReceiveState => ({
      ...state,
      sas,
      peerIdentity,
      file,
      phase: 'confirming'
    })
  ),
  on(
    receiveHandshakeFailed,
    (state, { error }): ReceiveState => ({ ...state, error, phase: 'failed' })
  ),
  on(
    receiveDigestReceived,
    (state, { digest }): ReceiveState => ({ ...state, digest })
  ),
  on(
    receiveAccepted,
    (state): ReceiveState => ({ ...state, phase: 'transferring' })
  ),
  on(
    receiveTransferStarted,
    (state, { total }): ReceiveState => ({
      ...state,
      transfer: { received: 0, total, route: 'direct', verified: false }
    })
  ),
  on(
    receiveTransferProgress,
    (state, { received }): ReceiveState => ({
      ...state,
      transfer: { ...state.transfer, received }
    })
  ),
  on(
    receiveTransferComplete,
    (state): ReceiveState => ({ ...state, phase: 'verifying' })
  ),
  on(
    receiveTransferVerified,
    (state): ReceiveState => ({
      ...state,
      phase: 'done',
      transfer: { ...state.transfer, verified: true }
    })
  ),
  on(
    receiveTransferFailed,
    (state, { error }): ReceiveState => ({ ...state, error, phase: 'failed' })
  ),
  on(receiveReset, receiveDisconnect, () => initialReceiveState)
);
