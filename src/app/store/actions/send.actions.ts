import { createAction, props } from '@ngrx/store';
import type { FileMetadata } from '../../features/send/file-metadata';
import type { RoomId, Sid } from '../../shared/interfaces/signal-session';

export const sendFileSelected = createAction(
  '[Send] File Selected',
  props<{ file: File; metadata: FileMetadata }>()
);

export const sendRoomCreated = createAction(
  '[Send] Room Created',
  props<{ roomId: RoomId; sid: Sid }>()
);

export const sendPasswordGenerated = createAction(
  '[Send] Password Generated',
  props<{ password: string }>()
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

export const sendReset = createAction('[Send] Reset');
