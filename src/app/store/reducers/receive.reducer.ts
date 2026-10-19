import { createReducer, on } from '@ngrx/store';
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
  receiveSasComputed
} from '../actions/receive.actions';

export const RECEIVE_FEATURE_KEY = 'receive';

export interface ReceiveState {
  phase: ReceivePhase;
  code: string | null;
  sas: string | null;
  peerIdentity: Identity | null;
  file: FileMetadata | null;
  digest: string | null;
  error: string | null;
}

export const initialReceiveState: ReceiveState = {
  phase: 'idle',
  code: null,
  sas: null,
  peerIdentity: null,
  file: null,
  digest: null,
  error: null
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
      error: null
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
  on(receiveReset, receiveDisconnect, () => initialReceiveState)
);
