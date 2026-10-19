import { createReducer, on } from '@ngrx/store';
import type { ReceivePhase } from '../../features/receive/receive-phase';
import { receiveCodeEntered, receiveReset } from '../actions/receive.actions';

export const RECEIVE_FEATURE_KEY = 'receive';

export interface ReceiveState {
  phase: ReceivePhase;
  code: string | null;
  error: string | null;
}

export const initialReceiveState: ReceiveState = {
  phase: 'idle',
  code: null,
  error: null
};

export const receiveReducer = createReducer(
  initialReceiveState,
  on(
    receiveCodeEntered,
    (_state, { code }): ReceiveState => ({
      phase: 'confirming',
      code,
      error: null
    })
  ),
  on(receiveReset, () => initialReceiveState)
);
