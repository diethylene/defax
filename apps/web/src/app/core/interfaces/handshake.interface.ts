import type { RoomId } from '@contract/signal/room-id.model';
import type { Sid } from '@contract/signal/sid.model';

/** Keys and code both peers hold after the handshake. */
export interface HandshakeResult {
  /** Key sealing and opening the signalling payloads. */
  signalingKey: CryptoKey;
  /** Short authentication string both peers compare out of band. */
  sas: string;
  /** Room the handshake ran in. */
  roomId: RoomId;
}

/** Session the initiator creates before waiting for a peer. */
export interface InitiatorSession {
  /** Room id the responder joins. */
  roomId: RoomId;
  /** Session id the responder receives on join. */
  sid: Sid;
  /** Password both peers derive the handshake from. */
  password: string;
}
