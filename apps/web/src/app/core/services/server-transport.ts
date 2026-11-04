import { Injectable } from '@angular/core';
import type { RoomCreated } from '@contract/signal/room-created.model';
import type { RoomId } from '@contract/signal/room-id.model';
import type { Sid } from '@contract/signal/sid.model';
import { EMPTY, type Observable } from 'rxjs';
import { SignalTransport } from '../../shared/interfaces/signal-transport';
import type { SignalMessage } from '../../shared/utilities/signal-message';

/** Placeholder transport used outside dev mode until the relay client lands. */
@Injectable()
export class ServerTransport extends SignalTransport {
  /** Emits no messages until the relay client is implemented. */
  override readonly messages$: Observable<SignalMessage> = EMPTY;

  /**
   * Creates a room through the relay.
   * @returns The created room.
   */
  override createRoom(): RoomCreated {
    throw new Error('ServerTransport.createRoom is not implemented');
  }

  /**
   * Joins a room through the relay.
   * @param _roomId Room to join.
   * @returns Promise resolving with the host session id.
   */
  override joinRoom(_roomId: RoomId): Promise<Sid> {
    throw new Error('ServerTransport.joinRoom is not implemented');
  }

  /**
   * Sends a message through the relay.
   * @param _message Message to send.
   */
  override send(_message: SignalMessage): void {
    throw new Error('ServerTransport.send is not implemented');
  }

  /** Closes the relay connection. */
  override close(): void {
    throw new Error('ServerTransport.close is not implemented');
  }
}
