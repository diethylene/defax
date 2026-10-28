import { createSelector } from '@ngrx/store';
import * as Match from 'effect/Match';
import { receiveFeature } from './receive.reducer';
import type { ReceiveErrorTag } from './receive-transitions';

/** User-facing message for each receive failure. */
export const receiveErrorMessages = {
  'handshake-failed': 'Handshake failed',
  'transfer-failed': 'Transfer failed',
  'verification-failed': 'file verification failed',
  'storage-full': 'not enough storage space',
  'missing-metadata': 'missing file metadata or digest',
} satisfies Record<ReceiveErrorTag, string>;

/** Message for the current failure, or none while the receive is not failed. */
export const selectReceiveErrorMessage = createSelector(
  receiveFeature.selectStatus,
  (status): string | undefined =>
    Match.value(status).pipe(
      Match.when({ _tag: 'Failed' }, (failed) => receiveErrorMessages[failed.error]),
      Match.orElse(() => undefined),
    ),
);
