import type { FileMetadata } from '@contract/signal/file-metadata.model';
import type { Identity } from '@contract/signal/identity.model';

/** Connection the initiator reports once the peer answers. */
export interface InitiatorConnection {
  /** Short authentication string both peers compare out of band. */
  sas: string;
  /** Details the responder sent about itself. */
  peerIdentity: Identity;
}

/** Connection the responder reports once the peer answers. */
export interface ResponderConnection {
  /** Short authentication string both peers compare out of band. */
  sas: string;
  /** Details the initiator sent about itself. */
  peerIdentity: Identity;
  /** Metadata of the file the initiator is sending. */
  fileInfo: FileMetadata | null;
}
