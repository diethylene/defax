import { createReducer, on } from '@ngrx/store';
import type { TransferRoute } from '../../core/interfaces/transfer.interface';
import type { SendPhase } from '../../features/send/send-phase/send-phase';
import type { FileMetadata } from '../../shared/interfaces/file-metadata';
import type { Identity } from '../../shared/interfaces/identity';
import type { RoomId } from '../../shared/interfaces/signal-session';
import {
  sendDisconnect,
  sendFileSelected,
  sendHandshakeFailed,
  sendHashComplete,
  sendHashFailed,
  sendHashProgress,
  sendHashStarted,
  sendPasswordGenerated,
  sendReset,
  sendRoomCreated,
  sendSasComputed,
  sendTransferComplete,
  sendTransferFailed,
  sendTransferProgress,
  sendTransferStarted,
  sendTransferVerified
} from '../actions/send.actions';

export const SEND_FEATURE_KEY = 'send';

export type HashStatus = 'idle' | 'hashing' | 'complete' | 'failed';

export interface HashState {
  status: HashStatus;
  progress: number;
  digest: string | null;
  error: string | null;
}

export interface SendTransferState {
  sent: number;
  total: number;
  route: TransferRoute | null;
  verified: boolean;
  durationMs: number | null;
}

export interface SendState {
  phase: SendPhase;
  file: File | null;
  metadata: FileMetadata | null;
  roomId: RoomId | null;
  password: string | null;
  sas: string | null;
  peerIdentity: Identity | null;
  error: string | null;
  hash: HashState;
  transfer: SendTransferState;
}

const initialHashState: HashState = {
  status: 'idle',
  progress: 0,
  digest: null,
  error: null
};

const initialTransferState: SendTransferState = {
  sent: 0,
  total: 0,
  route: null,
  verified: false,
  durationMs: null
};

export const initialSendState: SendState = {
  phase: 'idle',
  file: null,
  metadata: null,
  roomId: null,
  password: null,
  sas: null,
  peerIdentity: null,
  error: null,
  hash: initialHashState,
  transfer: initialTransferState
};

export const sendReducer = createReducer(
  initialSendState,
  on(
    sendFileSelected,
    (_state, { file, metadata }): SendState => ({
      phase: 'awaitingPeer',
      file,
      metadata,
      roomId: null,
      password: null,
      sas: null,
      peerIdentity: null,
      error: null,
      hash: initialHashState,
      transfer: initialTransferState
    })
  ),
  on(sendRoomCreated, (state, { roomId }): SendState => ({ ...state, roomId })),
  on(
    sendPasswordGenerated,
    (state, { password }): SendState => ({ ...state, password })
  ),
  on(
    sendSasComputed,
    (state, { sas, peerIdentity }): SendState => ({
      ...state,
      sas,
      peerIdentity,
      phase: 'sasConfirm'
    })
  ),
  on(
    sendHandshakeFailed,
    (state, { error }): SendState => ({ ...state, error, phase: 'failed' })
  ),
  on(
    sendHashStarted,
    (state): SendState => ({
      ...state,
      hash: { status: 'hashing', progress: 0, digest: null, error: null }
    })
  ),
  on(
    sendHashProgress,
    (state, { processed }): SendState => ({
      ...state,
      hash: { ...state.hash, status: 'hashing', progress: processed }
    })
  ),
  on(
    sendHashComplete,
    (state, { digest }): SendState => ({
      ...state,
      hash: { ...state.hash, status: 'complete', digest }
    })
  ),
  on(
    sendHashFailed,
    (state, { error }): SendState => ({
      ...state,
      hash: { ...state.hash, status: 'failed', error }
    })
  ),
  on(
    sendTransferStarted,
    (state, { total }): SendState => ({
      ...state,
      phase: 'transferring',
      transfer: {
        sent: 0,
        total,
        route: 'direct',
        verified: false,
        durationMs: null
      }
    })
  ),
  on(
    sendTransferProgress,
    (state, { sent }): SendState => ({
      ...state,
      transfer: { ...state.transfer, sent }
    })
  ),
  on(
    sendTransferComplete,
    (state): SendState => ({ ...state, phase: 'verifying' })
  ),
  on(
    sendTransferVerified,
    (state, { elapsed }): SendState => ({
      ...state,
      phase: 'done',
      transfer: { ...state.transfer, verified: true, durationMs: elapsed }
    })
  ),
  on(
    sendTransferFailed,
    (state, { error }): SendState => ({ ...state, error, phase: 'failed' })
  ),
  on(sendReset, sendDisconnect, () => initialSendState)
);
