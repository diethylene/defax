import { createAction, props } from '@ngrx/store';
import type { FileMetadata } from '@contract/signal/file-metadata.model';
import type { Identity } from '@contract/signal/identity.model';

export const receiveCodeEntered = createAction(
  '[Receive] Code Entered',
  props<{ code: string }>()
);

export const receiveSasComputed = createAction(
  '[Receive] SAS Computed',
  props<{ sas: string; peerIdentity: Identity; file: FileMetadata | null }>()
);

export const receiveDigestReceived = createAction(
  '[Receive] Digest Received',
  props<{ digest: string }>()
);

export const receiveHandshakeFailed = createAction(
  '[Receive] Handshake Failed',
  props<{ error: string }>()
);

export const receiveAccepted = createAction('[Receive] Accepted');

export const receiveTransferStarted = createAction(
  '[Receive] Transfer Started',
  props<{ total: number }>()
);

export const receiveTransferProgress = createAction(
  '[Receive] Transfer Progress',
  props<{ received: number }>()
);

export const receiveTransferComplete = createAction(
  '[Receive] Transfer Complete'
);

export const receiveTransferVerified = createAction(
  '[Receive] Transfer Verified',
  props<{ elapsed: number }>()
);

export const receiveTransferFailed = createAction(
  '[Receive] Transfer Failed',
  props<{ error: string }>()
);

export const receiveReset = createAction('[Receive] Reset');

export const receiveDisconnect = createAction('[Receive] Disconnect');
