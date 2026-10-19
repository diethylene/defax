import { createAction, props } from '@ngrx/store';

export const receiveCodeEntered = createAction(
  '[Receive] Code Entered',
  props<{ code: string }>()
);

export const receiveSasComputed = createAction(
  '[Receive] SAS Computed',
  props<{ sas: string }>()
);

export const receiveHandshakeFailed = createAction(
  '[Receive] Handshake Failed',
  props<{ error: string }>()
);

export const receiveReset = createAction('[Receive] Reset');
