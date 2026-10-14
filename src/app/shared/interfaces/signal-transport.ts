import type { Observable } from 'rxjs';
import type { SignalMessage } from './signal-message';
import type { RoomCreated, RoomId, Sid } from './signal-session';

export abstract class SignalTransport {
  abstract readonly messages$: Observable<SignalMessage>;
  abstract createRoom(): RoomCreated;
  abstract joinRoom(roomId: RoomId): Promise<Sid>;
  abstract send(message: SignalMessage): void;
  abstract close(): void;
}
