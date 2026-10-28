import type { FileMetadata } from '@contract/signal/file-metadata.model';
import type { Identity } from '@contract/signal/identity.model';
import type { TransferRoute } from '@web/core/interfaces/transfer.interface';
import * as Match from 'effect/Match';
import * as Option from 'effect/Option';

/** Why a receive stopped, at the granularity the UI reports. */
export type ReceiveErrorTag =
  | 'handshake-failed'
  | 'transfer-failed'
  | 'verification-failed'
  | 'storage-full'
  | 'missing-metadata';

/** Bytes received so far and how the file is travelling. */
export interface ReceiveProgress {
  /** Bytes stored so far. */
  readonly received: number;
  /** Bytes the sender announced. */
  readonly total: number;
  /** Path the bytes travel. */
  readonly route: TransferRoute;
}

/** Where a receive stands. */
export type ReceiveStatus =
  | { readonly _tag: 'Idle' }
  | { readonly _tag: 'Connecting'; readonly code: string }
  | {
      readonly _tag: 'Confirming';
      readonly sas: string;
      readonly peerIdentity: Identity;
      readonly file: FileMetadata | undefined;
      readonly digest: string | undefined;
    }
  | {
      readonly _tag: 'Transferring';
      readonly file: FileMetadata;
      readonly peerIdentity: Identity;
      readonly digest: string;
      readonly progress: ReceiveProgress;
    }
  | {
      readonly _tag: 'Verifying';
      readonly file: FileMetadata;
      readonly peerIdentity: Identity;
      readonly digest: string;
      readonly progress: ReceiveProgress;
    }
  | {
      readonly _tag: 'Done';
      readonly file: FileMetadata;
      readonly peerIdentity: Identity;
      readonly digest: string;
      readonly elapsedMs: number;
    }
  | { readonly _tag: 'Failed'; readonly error: ReceiveErrorTag };

/** Status waiting for the user to accept the file. */
type ConfirmingReceive = Extract<ReceiveStatus, { _tag: 'Confirming' }>;

/** File and digest a transfer needs before it can start. */
interface ReceiveReady {
  /** Metadata the sender announced. */
  readonly file: FileMetadata;
  /** Digest the sender announced. */
  readonly digest: string;
}

/** Progress of a transfer that has not reported its first byte yet. */
const freshProgress: ReceiveProgress = { received: 0, total: 0, route: 'direct' };

/**
 * Builds a failed status.
 * @param error Why the receive stopped.
 * @returns Failed status carrying the tag.
 */
export const failed = (error: ReceiveErrorTag): ReceiveStatus => ({ _tag: 'Failed', error });

/**
 * Reads the file and digest from a confirming status.
 * @param confirming Status waiting for the user to accept.
 * @returns Both values, or none while one is still missing.
 */
const ready = (confirming: ConfirmingReceive): Option.Option<ReceiveReady> =>
  Option.all({
    file: Option.fromNullishOr(confirming.file),
    digest: Option.fromNullishOr(confirming.digest),
  });

/**
 * Moves a confirming status to transferring once the file and digest are known.
 * @param confirming Status waiting for the user to accept.
 * @returns Transferring status, or Failed when metadata is missing.
 */
export const startable = (confirming: ConfirmingReceive): ReceiveStatus =>
  Option.match(ready(confirming), {
    onNone: () => failed('missing-metadata'),
    onSome: ({ file, digest }) => ({
      _tag: 'Transferring',
      file,
      peerIdentity: confirming.peerIdentity,
      digest,
      progress: freshProgress,
    }),
  });

/**
 * Records the digest on a confirming status.
 * @param status Current status.
 * @param digest Digest the sender announced.
 * @returns Status with the digest recorded, or the status unchanged.
 */
export const withDigest = (status: ReceiveStatus, digest: string): ReceiveStatus =>
  Match.value(status).pipe(
    Match.when({ _tag: 'Confirming' }, (confirming) => ({ ...confirming, digest })),
    Match.orElse(() => status),
  );

/**
 * Moves a confirming status to transferring when the user accepts.
 * @param status Current status.
 * @returns Transferring status, or the status unchanged.
 */
export const accepted = (status: ReceiveStatus): ReceiveStatus =>
  Match.value(status).pipe(
    Match.when({ _tag: 'Confirming' }, startable),
    Match.orElse(() => status),
  );

/**
 * Records the announced byte count on a transferring status.
 * @param status Current status.
 * @param total Bytes the sender announced.
 * @returns Status with the total recorded, or the status unchanged.
 */
export const started = (status: ReceiveStatus, total: number): ReceiveStatus =>
  Match.value(status).pipe(
    Match.when({ _tag: 'Transferring' }, (active) => ({
      ...active,
      progress: { ...active.progress, total },
    })),
    Match.orElse(() => status),
  );

/**
 * Records received bytes on a transferring status.
 * @param status Current status.
 * @param received Bytes stored so far.
 * @returns Status with the count recorded, or the status unchanged.
 */
export const progressed = (status: ReceiveStatus, received: number): ReceiveStatus =>
  Match.value(status).pipe(
    Match.when({ _tag: 'Transferring' }, (active) => ({
      ...active,
      progress: { ...active.progress, received },
    })),
    Match.orElse(() => status),
  );

/**
 * Moves a transferring status to verifying once every byte has arrived.
 * @param status Current status.
 * @returns Verifying status, or the status unchanged.
 */
export const completed = (status: ReceiveStatus): ReceiveStatus =>
  Match.value(status).pipe(
    Match.when(
      { _tag: 'Transferring' },
      (active): ReceiveStatus => ({
        ...active,
        _tag: 'Verifying',
      }),
    ),
    Match.orElse(() => status),
  );

/**
 * Moves a verifying status to done with the time the transfer took.
 * @param status Current status.
 * @param elapsedMs Milliseconds from the first event to verification.
 * @returns Done status, or the status unchanged.
 */
export const verified = (status: ReceiveStatus, elapsedMs: number): ReceiveStatus =>
  Match.value(status).pipe(
    Match.when(
      { _tag: 'Verifying' },
      (active): ReceiveStatus => ({
        _tag: 'Done',
        file: active.file,
        peerIdentity: active.peerIdentity,
        digest: active.digest,
        elapsedMs,
      }),
    ),
    Match.orElse(() => status),
  );
