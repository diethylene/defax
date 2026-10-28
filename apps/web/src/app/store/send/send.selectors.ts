import type { FileMetadata } from '@contract/signal/file-metadata.model';
import type { Identity } from '@contract/signal/identity.model';
import { createSelector } from '@ngrx/store';
import * as Match from 'effect/Match';
import type { SendPhase } from '../../features/send/send-phase/send-phase';
import { sendFeature } from './send.reducer';
import type { HashStatus, SendErrorTag, SendStatus } from './send-transitions';

/** Status of the send slice. */
export const selectSendStatus = sendFeature.selectStatus;

/** Phase the router shows for each send status. */
export const phaseForStatus = {
  Idle: 'idle',
  AwaitingPeer: 'awaitingPeer',
  SasConfirm: 'sasConfirm',
  Transferring: 'transferring',
  Verifying: 'verifying',
  Done: 'done',
  Failed: 'failed'
} satisfies Record<SendStatus['_tag'], SendPhase>;

/** Phase the router shows for the current send status. */
export const selectSendPhase = createSelector(
  selectSendStatus,
  (status) => phaseForStatus[status._tag]
);

/** User-facing text for every reason a send can stop. */
export const sendErrorMessages = {
  'handshake-failed': 'Handshake failed',
  'hash-failed': 'File hashing failed',
  'transfer-failed': 'Transfer failed',
  'verification-failed': 'receiver verification failed'
} satisfies Record<SendErrorTag, string>;

/** Message for the current send failure, or undefined when there is none. */
export const selectSendErrorMessage = createSelector(
  selectSendStatus,
  (status): string | undefined =>
    Match.value(status).pipe(
      Match.tag('Failed', ({ error }) => sendErrorMessages[error]),
      Match.orElse(() => undefined)
    )
);

/**
 * Hash carried by the current status.
 * @param status Current send status.
 * @returns The hash, or Idle when the status carries none.
 */
export const hashOf = (status: SendStatus): HashStatus =>
  Match.value(status).pipe(
    Match.tag(
      'AwaitingPeer',
      'SasConfirm',
      'Transferring',
      'Verifying',
      'Done',
      ({ hash }) => hash
    ),
    Match.orElse((): HashStatus => ({ _tag: 'Idle' }))
  );

/**
 * Digest carried by the current status.
 * @param status Current send status.
 * @returns The digest, or undefined until the hash completes.
 */
export const hashDigestOf = (status: SendStatus): string | undefined =>
  Match.value(hashOf(status)).pipe(
    Match.tag('Complete', ({ digest }) => digest),
    Match.orElse(() => undefined)
  );

/**
 * File metadata carried by the current status.
 * @param status Current send status.
 * @returns The metadata, or undefined before a file is chosen.
 */
export const metadataOf = (status: SendStatus): FileMetadata | undefined =>
  Match.value(status).pipe(
    Match.tag(
      'AwaitingPeer',
      'SasConfirm',
      'Transferring',
      'Verifying',
      'Done',
      ({ metadata }) => metadata
    ),
    Match.orElse(() => undefined)
  );

/**
 * Peer details carried by the current status.
 * @param status Current send status.
 * @returns The peer identity, or undefined before the handshake completes.
 */
export const peerIdentityOf = (status: SendStatus): Identity | undefined =>
  Match.value(status).pipe(
    Match.tag(
      'SasConfirm',
      'Transferring',
      'Verifying',
      'Done',
      ({ peerIdentity }) => peerIdentity
    ),
    Match.orElse(() => undefined)
  );

/**
 * Bytes moved by the current transfer.
 * @param status Current send status.
 * @returns The sent and total bytes, or undefined before the transfer starts.
 */
export const transferProgressOf = (
  status: SendStatus
): { readonly sent: number; readonly total: number } | undefined =>
  Match.value(status).pipe(
    Match.tag(
      'Transferring',
      'Verifying',
      'Done',
      ({ sent, total }) => ({ sent, total })
    ),
    Match.orElse(() => undefined)
  );

/**
 * Tells whether the receiver is checking the digest.
 * @param status Current send status.
 * @returns True while the transfer is verifying.
 */
export const isVerifying = (status: SendStatus): boolean =>
  Match.value(status).pipe(
    Match.tag('Verifying', () => true),
    Match.orElse(() => false)
  );
