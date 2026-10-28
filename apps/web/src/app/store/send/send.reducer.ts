import { createFeature, createReducer, on } from '@ngrx/store';
import { SendActions } from './send.actions';
import {
  type SendStatus,
  withHash,
  withPassword,
  withRoom,
  withSas,
  withTransferComplete,
  withTransferProgress,
  withTransferStarted,
  withVerified,
} from './send-transitions';

/** Send slice of the global store. */
export interface SendState {
  /** Where the send stands. */
  readonly status: SendStatus;
}

/** Slice state before a file is chosen. */
export const initialSendState: SendState = { status: { _tag: 'Idle' } };

/** The send feature: reducer plus generated selectors. */
export const sendFeature = createFeature({
  name: 'send',
  reducer: createReducer(
    initialSendState,
    on(
      SendActions.fileSelected,
      (_, { file, metadata }): SendState => ({
        status: {
          _tag: 'AwaitingPeer',
          file,
          metadata,
          roomId: '',
          password: '',
          hash: { _tag: 'Idle' },
        },
      }),
    ),
    on(
      SendActions.roomCreated,
      (state, { roomId }): SendState => ({
        status: withRoom(state.status, roomId),
      }),
    ),
    on(
      SendActions.passwordGenerated,
      (state, { password }): SendState => ({
        status: withPassword(state.status, password),
      }),
    ),
    on(
      SendActions.sasComputed,
      (state, { sas, peerIdentity }): SendState => ({
        status: withSas(state.status, sas, peerIdentity),
      }),
    ),
    on(
      SendActions.handshakeFailed,
      (): SendState => ({
        status: { _tag: 'Failed', error: 'handshake-failed' },
      }),
    ),
    on(
      SendActions.hashStarted,
      (state): SendState => ({
        status: withHash(state.status, { _tag: 'Hashing', progress: 0 }),
      }),
    ),
    on(
      SendActions.hashProgress,
      (state, { processed }): SendState => ({
        status: withHash(state.status, {
          _tag: 'Hashing',
          progress: processed,
        }),
      }),
    ),
    on(
      SendActions.hashComplete,
      (state, { digest }): SendState => ({
        status: withHash(state.status, { _tag: 'Complete', digest }),
      }),
    ),
    on(
      SendActions.hashFailed,
      (): SendState => ({
        status: { _tag: 'Failed', error: 'hash-failed' },
      }),
    ),
    on(
      SendActions.transferStarted,
      (state, { total }): SendState => ({
        status: withTransferStarted(state.status, total),
      }),
    ),
    on(
      SendActions.transferProgress,
      (state, { sent }): SendState => ({
        status: withTransferProgress(state.status, sent),
      }),
    ),
    on(
      SendActions.transferComplete,
      (state): SendState => ({
        status: withTransferComplete(state.status),
      }),
    ),
    on(
      SendActions.transferVerified,
      (state, { elapsed }): SendState => ({
        status: withVerified(state.status, elapsed),
      }),
    ),
    on(
      SendActions.transferFailed,
      (_, { error }): SendState => ({
        status: { _tag: 'Failed', error },
      }),
    ),
    on(SendActions.reset, SendActions.disconnect, () => initialSendState),
  ),
});
