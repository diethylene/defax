import type { FileMetadata } from '@contract/signal/file-metadata.model';
import type { Identity } from '@contract/signal/identity.model';
import { createActionGroup, emptyProps, props } from '@ngrx/store';
import type { RoomId } from '../../shared/interfaces/signal-session';
import type { SendErrorTag } from './send-transitions';

/** Everything that can happen to the send slice. */
export const SendActions = createActionGroup({
  source: 'Send',
  events: {
    'File Selected': props<{
      readonly file: File;
      readonly metadata: FileMetadata;
    }>(),
    'Room Created': props<{ readonly roomId: RoomId }>(),
    'Password Generated': props<{ readonly password: string }>(),
    'Sas Computed': props<{
      readonly sas: string;
      readonly peerIdentity: Identity;
    }>(),
    'Handshake Failed': emptyProps(),
    'Hash Started': emptyProps(),
    'Hash Progress': props<{ readonly processed: number }>(),
    'Hash Complete': props<{ readonly digest: string }>(),
    'Hash Failed': emptyProps(),
    'Transfer Started': props<{ readonly total: number }>(),
    'Transfer Progress': props<{ readonly sent: number }>(),
    'Transfer Complete': emptyProps(),
    'Transfer Verified': props<{ readonly elapsed: number }>(),
    'Transfer Failed': props<{ readonly error: SendErrorTag }>(),
    Reset: emptyProps(),
    Disconnect: emptyProps()
  }
});
