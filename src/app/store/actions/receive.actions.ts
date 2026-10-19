import { createAction, props } from '@ngrx/store';
import type { FileMetadata } from '../../shared/interfaces/file-metadata';
import type { Identity } from '../../shared/interfaces/identity';

export const receiveCodeEntered = createAction(
  '[Receive] Code Entered',
  props<{ code: string }>()
);

export const receiveSasComputed = createAction(
  '[Receive] SAS Computed',
  props<{ sas: string; peerIdentity: Identity; file: FileMetadata | null }>()
);

export const receiveHandshakeFailed = createAction(
  '[Receive] Handshake Failed',
  props<{ error: string }>()
);

export const receiveAccepted = createAction('[Receive] Accepted');

export const receiveReset = createAction('[Receive] Reset');
