import { createReducer, on } from '@ngrx/store';
import type { SendPhase } from '../../features/send/send-phase';
import type { FileMetadata } from '../../shared/interfaces/file-metadata';
import type { RoomId } from '../../shared/interfaces/signal-session';
import {
  sendFileSelected,
  sendHandshakeFailed,
  sendHashComplete,
  sendHashFailed,
  sendHashProgress,
  sendHashStarted,
  sendPasswordGenerated,
  sendReset,
  sendRoomCreated,
  sendSasComputed
} from '../actions/send.actions';

export const SEND_FEATURE_KEY = 'send';

export type HashStatus = 'idle' | 'hashing' | 'complete' | 'failed';

export interface HashState {
  status: HashStatus;
  progress: number;
  digest: string | null;
  error: string | null;
}

export interface SendState {
  phase: SendPhase;
  file: File | null;
  metadata: FileMetadata | null;
  roomId: RoomId | null;
  password: string | null;
  sas: string | null;
  error: string | null;
  hash: HashState;
}

const initialHashState: HashState = {
  status: 'idle',
  progress: 0,
  digest: null,
  error: null
};

export const initialSendState: SendState = {
  phase: 'idle',
  file: null,
  metadata: null,
  roomId: null,
  password: null,
  sas: null,
  error: null,
  hash: initialHashState
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
      error: null,
      hash: initialHashState
    })
  ),
  on(sendRoomCreated, (state, { roomId }): SendState => ({ ...state, roomId })),
  on(
    sendPasswordGenerated,
    (state, { password }): SendState => ({ ...state, password })
  ),
  on(
    sendSasComputed,
    (state, { sas }): SendState => ({ ...state, sas, phase: 'sasConfirm' })
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
  on(sendReset, () => initialSendState)
);
