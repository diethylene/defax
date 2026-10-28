import type { FileMetadata } from '@contract/signal/file-metadata.model';
import type { Identity } from '@contract/signal/identity.model';
import { createFeature, createReducer, on } from '@ngrx/store';
import * as Match from 'effect/Match';
import type { RoomId } from '../../shared/interfaces/signal-session';
import { SendActions } from './send.actions';

/** Progress of the file hash computed while the receiver is matched. */
export type HashStatus =
  | { readonly _tag: 'Idle' }
  | { readonly _tag: 'Hashing'; readonly progress: number }
  | { readonly _tag: 'Complete'; readonly digest: string };

/** Why a send stopped. */
export type SendErrorTag =
  | 'handshake-failed'
  | 'hash-failed'
  | 'transfer-failed'
  | 'verification-failed';

/** Everything the sender knows once the receiver is matched. */
interface MatchedSend {
  /** File being sent. */
  readonly file: File;
  /** Metadata announced to the receiver. */
  readonly metadata: FileMetadata;
  /** Room both peers joined. */
  readonly roomId: RoomId;
  /** Password that opens the room. */
  readonly password: string;
  /** Short authentication string both peers compare. */
  readonly sas: string;
  /** Details the receiver sent about itself. */
  readonly peerIdentity: Identity;
  /** Progress of the file hash. */
  readonly hash: HashStatus;
}

/** Bytes moved so far out of the total. */
interface TransferProgress {
  /** Bytes already sent. */
  readonly sent: number;
  /** Bytes the file holds. */
  readonly total: number;
}

/** Where the send stands. */
export type SendStatus =
  | { readonly _tag: 'Idle' }
  | {
      readonly _tag: 'AwaitingPeer';
      readonly file: File;
      readonly metadata: FileMetadata;
      readonly roomId: RoomId;
      readonly password: string;
      readonly hash: HashStatus;
    }
  | ({ readonly _tag: 'SasConfirm' } & MatchedSend)
  | ({ readonly _tag: 'Transferring' } & MatchedSend & TransferProgress)
  | ({ readonly _tag: 'Verifying' } & MatchedSend & TransferProgress)
  | ({
      readonly _tag: 'Done';
    } & MatchedSend &
      TransferProgress & { readonly durationMs: number })
  | { readonly _tag: 'Failed'; readonly error: SendErrorTag };

/** Send slice of the global store. */
export interface SendState {
  /** Where the send stands. */
  readonly status: SendStatus;
}

/** Slice state before a file is chosen. */
export const initialSendState: SendState = { status: { _tag: 'Idle' } };

/**
 * Applies a hash update to every status that carries a hash.
 * @param status Current send status.
 * @param hash Hash status to store.
 * @returns The status with the new hash, or the status unchanged.
 */
const withHash = (status: SendStatus, hash: HashStatus): SendStatus =>
  Match.value(status).pipe(
    Match.tag(
      'AwaitingPeer',
      'SasConfirm',
      'Transferring',
      'Verifying',
      'Done',
      (current) => ({ ...current, hash })
    ),
    Match.orElse(() => status)
  );

/**
 * Stores the room id while the peer is still awaited.
 * @param status Current send status.
 * @param roomId Room the sender created.
 * @returns The status with the room id, or the status unchanged.
 */
const withRoom = (status: SendStatus, roomId: RoomId): SendStatus =>
  Match.value(status).pipe(
    Match.tag('AwaitingPeer', (current) => ({ ...current, roomId })),
    Match.orElse(() => status)
  );

/**
 * Stores the password while the peer is still awaited.
 * @param status Current send status.
 * @param password Password that opens the room.
 * @returns The status with the password, or the status unchanged.
 */
const withPassword = (status: SendStatus, password: string): SendStatus =>
  Match.value(status).pipe(
    Match.tag('AwaitingPeer', (current) => ({ ...current, password })),
    Match.orElse(() => status)
  );

/**
 * Marks the transfer as verified and finished.
 * @param status Current send status.
 * @param durationMs Time the transfer took.
 * @returns The done status, or the status unchanged.
 */
const withVerified = (status: SendStatus, durationMs: number): SendStatus =>
  Match.value(status).pipe(
    Match.tag('Transferring', 'Verifying', (current) => ({
      ...current,
      _tag: 'Done' as const,
      durationMs
    })),
    Match.orElse(() => status)
  );

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
          hash: { _tag: 'Idle' }
        }
      })
    ),
    on(SendActions.roomCreated, (state, { roomId }): SendState => ({
      status: withRoom(state.status, roomId)
    })),
    on(SendActions.passwordGenerated, (state, { password }): SendState => ({
      status: withPassword(state.status, password)
    })),
    on(
      SendActions.sasComputed,
      (state, { sas, peerIdentity }): SendState => ({
        status: Match.value(state.status).pipe(
          Match.tag('AwaitingPeer', (current) => ({
            ...current,
            _tag: 'SasConfirm' as const,
            sas,
            peerIdentity
          })),
          Match.orElse(() => state.status)
        )
      })
    ),
    on(SendActions.handshakeFailed, (): SendState => ({
      status: { _tag: 'Failed', error: 'handshake-failed' }
    })),
    on(SendActions.hashStarted, (state): SendState => ({
      status: withHash(state.status, { _tag: 'Hashing', progress: 0 })
    })),
    on(SendActions.hashProgress, (state, { processed }): SendState => ({
      status: withHash(state.status, {
        _tag: 'Hashing',
        progress: processed
      })
    })),
    on(SendActions.hashComplete, (state, { digest }): SendState => ({
      status: withHash(state.status, { _tag: 'Complete', digest })
    })),
    on(SendActions.hashFailed, (): SendState => ({
      status: { _tag: 'Failed', error: 'hash-failed' }
    })),
    on(SendActions.transferStarted, (state, { total }): SendState => ({
      status: Match.value(state.status).pipe(
        Match.tag('SasConfirm', (current) => ({
          ...current,
          _tag: 'Transferring' as const,
          sent: 0,
          total
        })),
        Match.orElse(() => state.status)
      )
    })),
    on(SendActions.transferProgress, (state, { sent }): SendState => ({
      status: Match.value(state.status).pipe(
        Match.tag('Transferring', (current) => ({ ...current, sent })),
        Match.orElse(() => state.status)
      )
    })),
    on(SendActions.transferComplete, (state): SendState => ({
      status: Match.value(state.status).pipe(
        Match.tag('Transferring', (current) => ({
          ...current,
          _tag: 'Verifying' as const
        })),
        Match.orElse(() => state.status)
      )
    })),
    on(SendActions.transferVerified, (state, { elapsed }): SendState => ({
      status: withVerified(state.status, elapsed)
    })),
    on(SendActions.transferFailed, (_, { error }): SendState => ({
      status: { _tag: 'Failed', error }
    })),
    on(SendActions.reset, SendActions.disconnect, () => initialSendState)
  )
});
