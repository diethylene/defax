import type { FileMetadata } from '@contract/signal/file-metadata.model';
import type { Identity } from '@contract/signal/identity.model';
import * as Match from 'effect/Match';
import type { RoomId } from '../../shared/interfaces/signal-session';

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

/**
 * Applies a hash update to every status that carries a hash.
 * @param status Current send status.
 * @param hash Hash status to store.
 * @returns The status with the new hash, or the status unchanged.
 */
export const withHash = (status: SendStatus, hash: HashStatus): SendStatus =>
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
export const withRoom = (status: SendStatus, roomId: RoomId): SendStatus =>
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
export const withPassword = (status: SendStatus, password: string): SendStatus =>
  Match.value(status).pipe(
    Match.tag('AwaitingPeer', (current) => ({ ...current, password })),
    Match.orElse(() => status)
  );

/**
 * Moves an awaited peer to the confirmation step once the sas is known.
 * @param status Current send status.
 * @param sas Short authentication string both peers compare.
 * @param peerIdentity Details the receiver sent about itself.
 * @returns The confirmation status, or the status unchanged.
 */
export const withSas = (
  status: SendStatus,
  sas: string,
  peerIdentity: Identity
): SendStatus =>
  Match.value(status).pipe(
    Match.tag('AwaitingPeer', (current) => ({
      ...current,
      _tag: 'SasConfirm' as const,
      sas,
      peerIdentity
    })),
    Match.orElse(() => status)
  );

/**
 * Moves a confirmed send to transferring once the receiver answers.
 * @param status Current send status.
 * @param total Bytes the file holds.
 * @returns The transferring status, or the status unchanged.
 */
export const withTransferStarted = (status: SendStatus, total: number): SendStatus =>
  Match.value(status).pipe(
    Match.tag('SasConfirm', (current) => ({
      ...current,
      _tag: 'Transferring' as const,
      sent: 0,
      total
    })),
    Match.orElse(() => status)
  );

/**
 * Records the bytes sent so far on a transferring status.
 * @param status Current send status.
 * @param sent Bytes already sent.
 * @returns The status with the count recorded, or the status unchanged.
 */
export const withTransferProgress = (status: SendStatus, sent: number): SendStatus =>
  Match.value(status).pipe(
    Match.tag('Transferring', (current) => ({ ...current, sent })),
    Match.orElse(() => status)
  );

/**
 * Moves a transferring status to verifying once every byte has left.
 * @param status Current send status.
 * @returns The verifying status, or the status unchanged.
 */
export const withTransferComplete = (status: SendStatus): SendStatus =>
  Match.value(status).pipe(
    Match.tag('Transferring', (current) => ({
      ...current,
      _tag: 'Verifying' as const
    })),
    Match.orElse(() => status)
  );

/**
 * Marks the transfer as verified and finished.
 * @param status Current send status.
 * @param durationMs Time the transfer took.
 * @returns The done status, or the status unchanged.
 */
export const withVerified = (status: SendStatus, durationMs: number): SendStatus =>
  Match.value(status).pipe(
    Match.tag('Transferring', 'Verifying', (current) => ({
      ...current,
      _tag: 'Done' as const,
      durationMs
    })),
    Match.orElse(() => status)
  );
