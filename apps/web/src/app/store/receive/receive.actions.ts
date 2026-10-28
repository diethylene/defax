import type { FileMetadata } from '@contract/signal/file-metadata.model';
import type { Identity } from '@contract/signal/identity.model';
import { createActionGroup, emptyProps, props } from '@ngrx/store';
import type { ReceiveErrorTag } from './receive-transitions';

/** Everything that can happen to the receive slice. */
export const ReceiveActions = createActionGroup({
  source: 'Receive',
  events: {
    'Code Entered': props<{ readonly code: string }>(),
    'Sas Computed': props<{
      readonly sas: string;
      readonly peerIdentity: Identity;
      readonly file: FileMetadata | undefined;
    }>(),
    'Digest Received': props<{ readonly digest: string }>(),
    'Handshake Failed': emptyProps(),
    Accepted: emptyProps(),
    'Transfer Started': props<{ readonly total: number }>(),
    'Transfer Progress': props<{ readonly received: number }>(),
    'Transfer Complete': emptyProps(),
    'Transfer Verified': props<{ readonly elapsed: number }>(),
    'Transfer Failed': props<{ readonly error: ReceiveErrorTag }>(),
    Reset: emptyProps(),
    Disconnect: emptyProps(),
  },
});
