import { createReducer, on } from '@ngrx/store';
import type { FileMetadata } from '../../features/send/file-metadata';
import type { SendPhase } from '../../features/send/send-phase';
import { sendFileSelected, sendReset } from '../actions/send.actions';

export const SEND_FEATURE_KEY = 'send';

export interface SendState {
  phase: SendPhase;
  file: File | null;
  metadata: FileMetadata | null;
}

export const initialSendState: SendState = {
  phase: 'idle',
  file: null,
  metadata: null
};

export const sendReducer = createReducer(
  initialSendState,
  on(
    sendFileSelected,
    (_state, { file, metadata }): SendState => ({
      phase: 'awaitingPeer',
      file,
      metadata
    })
  ),
  on(sendReset, () => initialSendState)
);
