import { createFeature, createReducer, on } from '@ngrx/store';
import { ReceiveActions } from './receive.actions';
import {
  accepted,
  completed,
  failed,
  progressed,
  type ReceiveStatus,
  started,
  verified,
  withDigest,
} from './receive-transitions';

/** Receive slice of the global store. */
export interface ReceiveState {
  /** The current status. */
  readonly status: ReceiveStatus;
}

/** Slice state before a code is entered. */
export const initialReceiveState: ReceiveState = { status: { _tag: 'Idle' } };

/** The receive feature: reducer plus generated selectors. */
export const receiveFeature = createFeature({
  name: 'receive',
  reducer: createReducer(
    initialReceiveState,
    on(
      ReceiveActions.codeEntered,
      (_, { code }): ReceiveState => ({
        status: { _tag: 'Connecting', code },
      }),
    ),
    on(
      ReceiveActions.sasComputed,
      (_, { sas, peerIdentity, file }): ReceiveState => ({
        status: { _tag: 'Confirming', sas, peerIdentity, file, digest: undefined },
      }),
    ),
    on(
      ReceiveActions.digestReceived,
      (state, { digest }): ReceiveState => ({
        status: withDigest(state.status, digest),
      }),
    ),
    on(
      ReceiveActions.handshakeFailed,
      (): ReceiveState => ({
        status: failed('handshake-failed'),
      }),
    ),
    on(
      ReceiveActions.accepted,
      (state): ReceiveState => ({
        status: accepted(state.status),
      }),
    ),
    on(
      ReceiveActions.transferStarted,
      (state, { total }): ReceiveState => ({
        status: started(state.status, total),
      }),
    ),
    on(
      ReceiveActions.transferProgress,
      (state, { received }): ReceiveState => ({
        status: progressed(state.status, received),
      }),
    ),
    on(
      ReceiveActions.transferComplete,
      (state): ReceiveState => ({
        status: completed(state.status),
      }),
    ),
    on(
      ReceiveActions.transferVerified,
      (state, { elapsed }): ReceiveState => ({
        status: verified(state.status, elapsed),
      }),
    ),
    on(
      ReceiveActions.transferFailed,
      (_, { error }): ReceiveState => ({
        status: failed(error),
      }),
    ),
    on(ReceiveActions.reset, ReceiveActions.disconnect, () => initialReceiveState),
  ),
});
