import { Injectable } from '@angular/core';
import { EMPTY, type Observable } from 'rxjs';
import type { SignalMessage } from '../../shared/interfaces/signal-message';
import type {
  RoomCreated,
  RoomId,
  Sid
} from '../../shared/interfaces/signal-session';
import { SignalTransport } from '../../shared/interfaces/signal-transport';

@Injectable()
export class ServerTransport extends SignalTransport {
  override readonly messages$: Observable<SignalMessage> = EMPTY;

  override createRoom(): RoomCreated {
    throw new Error('ServerTransport.createRoom is not implemented');
  }

  override joinRoom(_roomId: RoomId): Promise<Sid> {
    throw new Error('ServerTransport.joinRoom is not implemented');
  }

  override send(_message: SignalMessage): void {
    throw new Error('ServerTransport.send is not implemented');
  }

  override close(): void {
    throw new Error('ServerTransport.close is not implemented');
  }
}
