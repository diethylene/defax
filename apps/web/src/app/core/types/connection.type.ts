import type { Role } from '@contract/signal/role.type';
import type { RoomId } from '../../shared/interfaces/signal-session';

/** Connection with no handshake completed. */
export interface IdleConnection {
  /** Discriminant. */
  readonly _tag: 'idle';
}

/** Connection whose handshake produced the signalling key. */
export interface EstablishedConnection {
  /** Discriminant. */
  readonly _tag: 'established';
  /** Key sealing and opening the signalling payloads. */
  readonly signalingKey: CryptoKey;
  /** Room both peers bind their payloads to. */
  readonly roomId: RoomId;
  /** Role this side plays in the pair. */
  readonly role: Role;
}

/** Lifecycle state of the signalling connection. */
export type Connection = IdleConnection | EstablishedConnection;
