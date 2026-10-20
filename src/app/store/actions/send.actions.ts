import { createAction, props } from '@ngrx/store';
import type { FileMetadata } from '../../shared/interfaces/file-metadata';
import type { Identity } from '../../shared/interfaces/identity';
import type { RoomId } from '../../shared/interfaces/signal-session';

export const sendFileSelected = createAction(
  '[Send] File Selected',
  props<{ file: File; metadata: FileMetadata }>()
);

export const sendRoomCreated = createAction(
  '[Send] Room Created',
  props<{ roomId: RoomId }>()
);

export const sendPasswordGenerated = createAction(
  '[Send] Password Generated',
  props<{ password: string }>()
);

export const sendSasComputed = createAction(
  '[Send] SAS Computed',
  props<{ sas: string; peerIdentity: Identity }>()
);

export const sendHandshakeFailed = createAction(
  '[Send] Handshake Failed',
  props<{ error: string }>()
);

export const sendHashStarted = createAction('[Send] Hash Started');

export const sendHashProgress = createAction(
  '[Send] Hash Progress',
  props<{ processed: number }>()
);

export const sendHashComplete = createAction(
  '[Send] Hash Complete',
  props<{ digest: string }>()
);

export const sendHashFailed = createAction(
  '[Send] Hash Failed',
  props<{ error: string }>()
);

export const sendTransferStarted = createAction(
  '[Send] Transfer Started',
  props<{ total: number }>()
);

export const sendTransferProgress = createAction(
  '[Send] Transfer Progress',
  props<{ sent: number }>()
);

export const sendTransferComplete = createAction('[Send] Transfer Complete');

export const sendTransferVerified = createAction(
  '[Send] Transfer Verified',
  props<{ elapsed: number }>()
);

export const sendTransferFailed = createAction(
  '[Send] Transfer Failed',
  props<{ error: string }>()
);

export const sendReset = createAction('[Send] Reset');

export const sendDisconnect = createAction('[Send] Disconnect');
