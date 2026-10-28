import type { Observable } from 'rxjs';
import type { SignalMessage } from '../utilities/signal-message';
import type { RoomCreated, RoomId, Sid } from './signal-session';

/** Transport exchanging signaling messages with the other peer. */
export abstract class SignalTransport {
  /** Every inbound signaling message. */
  abstract readonly messages$: Observable<SignalMessage>;

  /**
   * Creates a room and becomes its host.
   * @returns The generated room id and the host session id.
   */
  abstract createRoom(): RoomCreated;

  /**
   * Joins an existing room as a guest.
   * @param roomId Room to join.
   * @returns Promise resolving with the host session id.
   */
  abstract joinRoom(roomId: RoomId): Promise<Sid>;

  /**
   * Sends a signaling message to the other peer.
   * @param message Message to send.
   */
  abstract send(message: SignalMessage): void;

  /** Closes the transport and releases its resources. */
  abstract close(): void;
}
