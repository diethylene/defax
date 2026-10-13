import { createAction, props } from '@ngrx/store';
import type { FileMetadata } from '../../features/send/file-metadata';

export const sendFileSelected = createAction(
  '[Send] File Selected',
  props<{ file: File; metadata: FileMetadata }>()
);

export const sendReset = createAction('[Send] Reset');
