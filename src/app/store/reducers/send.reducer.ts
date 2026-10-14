import { createReducer, on } from '@ngrx/store';
import type { FileMetadata } from '../../features/send/file-metadata';
import type { SendPhase } from '../../features/send/send-phase';
import type { RoomId } from '../../shared/interfaces/signal-session';
import {
  sendFileSelected,
  sendHashComplete,
  sendHashFailed,
  sendHashProgress,
  sendHashStarted,
  sendPasswordGenerated,
  sendReset,
  sendRoomCreated
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
      hash: initialHashState
    })
  ),
  on(sendRoomCreated, (state, { roomId }): SendState => ({ ...state, roomId })),
  on(
    sendPasswordGenerated,
    (state, { password }): SendState => ({ ...state, password })
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
