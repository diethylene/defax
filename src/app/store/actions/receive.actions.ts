import { createAction, props } from '@ngrx/store';

export const receiveCodeEntered = createAction(
  '[Receive] Code Entered',
  props<{ code: string }>()
);

export const receiveReset = createAction('[Receive] Reset');
