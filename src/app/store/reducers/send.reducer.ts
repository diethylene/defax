import { createReducer, on } from '@ngrx/store';
import type { FileMetadata } from '../../features/send/file-metadata';
import type { SendPhase } from '../../features/send/send-phase';
import {
  sendFileSelected,
  sendHashComplete,
  sendHashFailed,
  sendHashProgress,
  sendHashStarted,
  sendReset
} from '../actions/send.actions';

export const SEND_FEATURE_KEY = 'send';

export type HashStatus = 'idle' | 'hashing' | 'complete' | 'failed';

export interface SendState {
  phase: SendPhase;
  file: File | null;
  metadata: FileMetadata | null;
  hashStatus: HashStatus;
  hashProgress: number;
  hashDigest: string | null;
  hashError: string | null;
}

export const initialSendState: SendState = {
  phase: 'idle',
  file: null,
  metadata: null,
  hashStatus: 'idle',
  hashProgress: 0,
  hashDigest: null,
  hashError: null
};

export const sendReducer = createReducer(
  initialSendState,
  on(
    sendFileSelected,
    (_state, { file, metadata }): SendState => ({
      phase: 'awaitingPeer',
      file,
      metadata,
      hashStatus: 'idle',
      hashProgress: 0,
      hashDigest: null,
      hashError: null
    })
  ),
  on(
    sendHashStarted,
    (state): SendState => ({
      ...state,
      hashStatus: 'hashing',
      hashProgress: 0,
      hashDigest: null,
      hashError: null
    })
  ),
  on(
    sendHashProgress,
    (state, { processed }): SendState => ({
      ...state,
      hashStatus: 'hashing',
      hashProgress: processed,
      hashError: null
    })
  ),
  on(
    sendHashComplete,
    (state, { digest }): SendState => ({
      ...state,
      hashStatus: 'complete',
      hashDigest: digest
    })
  ),
  on(
    sendHashFailed,
    (state, { error }): SendState => ({
      ...state,
      hashStatus: 'failed',
      hashError: error
    })
  ),
  on(sendReset, () => initialSendState)
);
