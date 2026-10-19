import { createReducer, on } from '@ngrx/store';
import type { ReceivePhase } from '../../features/receive/receive-phase';
import {
  receiveCodeEntered,
  receiveHandshakeFailed,
  receiveReset,
  receiveSasComputed
} from '../actions/receive.actions';

export const RECEIVE_FEATURE_KEY = 'receive';

export interface ReceiveState {
  phase: ReceivePhase;
  code: string | null;
  sas: string | null;
  error: string | null;
}

export const initialReceiveState: ReceiveState = {
  phase: 'idle',
  code: null,
  sas: null,
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
      error: null
    })
  ),
  on(
    receiveSasComputed,
    (state, { sas }): ReceiveState => ({ ...state, sas, phase: 'confirming' })
  ),
  on(
    receiveHandshakeFailed,
    (state, { error }): ReceiveState => ({ ...state, error, phase: 'failed' })
  ),
  on(receiveReset, () => initialReceiveState)
);
