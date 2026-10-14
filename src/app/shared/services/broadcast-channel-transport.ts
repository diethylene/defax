import { Subject } from 'rxjs';
import type { SignalMessage } from '../interfaces/signal-message';
import type { RoomCreated, RoomId, Sid } from '../interfaces/signal-session';
import { SignalTransport } from '../interfaces/signal-transport';
import { createSid, decodeSid, encodeSid } from '../utils/sid';
import { parseSignalMessage } from '../utils/signal-message';

type Mode = 'host' | 'guest';

export class BroadcastChannelTransport extends SignalTransport {
  private readonly messages = new Subject<SignalMessage>();
  override readonly messages$ = this.messages.asObservable();

  private channel: BroadcastChannel | null = null;
  private mode: Mode | null = null;
  private sid: Sid | null = null;
  private joined = false;
  private outgoing: SignalMessage[] = [];
  private joinResolve: ((sid: Sid) => void) | null = null;
  private joinReject: ((error: Error) => void) | null = null;

  private readonly onMessage = (event: MessageEvent): void => {
    const message = parseSignalMessage(event.data);
    if (!message) return;
    this.handleInbound(message);
    this.messages.next(message);
  };

  override createRoom(): RoomCreated {
    this.close();
    this.mode = 'host';
    const sid = createSid();
    this.sid = sid;
    const roomId = this.generateRoomId();
    this.openChannel(roomId);
    return { roomId, sid };
  }

  override joinRoom(roomId: RoomId): Promise<Sid> {
    this.close();
    this.mode = 'guest';
    this.openChannel(roomId);
    return new Promise<Sid>((resolve, reject) => {
      this.joinResolve = resolve;
      this.joinReject = reject;
      this.post({ type: 'join' });
    });
  }

  override send(message: SignalMessage): void {
    if (this.mode === 'host' && !this.joined) {
      this.outgoing.push(message);
      return;
    }
    this.post(message);
  }

  override close(): void {
    if (this.channel) {
      this.channel.removeEventListener('message', this.onMessage);
      this.channel.close();
      this.channel = null;
    }
    this.mode = null;
    this.sid = null;
    this.joined = false;
    this.outgoing = [];
    if (this.joinReject) {
      this.joinReject(new Error('Transport closed'));
    }
    this.joinResolve = null;
    this.joinReject = null;
  }

  private openChannel(roomId: RoomId): void {
    this.channel = new BroadcastChannel(`room-${roomId}`);
    this.channel.addEventListener('message', this.onMessage);
  }

  private handleInbound(message: SignalMessage): void {
    if (this.mode === 'host' && message.type === 'join') {
      this.acceptJoin();
      return;
    }
    if (this.mode !== 'guest') return;
    if (message.type === 'joined') {
      this.resolveJoin(decodeSid(message.sid));
      return;
    }
    if (message.type === 'full') {
      this.rejectJoin(new Error('Room is full'));
    }
  }

  private acceptJoin(): void {
    if (this.joined) {
      this.post({ type: 'full' });
      return;
    }
    this.joined = true;
    for (const message of this.outgoing) {
      this.post(message);
    }
    this.outgoing = [];
    if (this.sid) {
      this.post({ type: 'joined', sid: encodeSid(this.sid) });
    }
  }

  private resolveJoin(sid: Sid): void {
    this.joinResolve?.(sid);
    this.joinResolve = null;
    this.joinReject = null;
  }

  private rejectJoin(error: Error): void {
    this.joinReject?.(error);
    this.joinResolve = null;
    this.joinReject = null;
  }

  private post(message: SignalMessage): void {
    this.channel?.postMessage(message);
  }

  private generateRoomId(): RoomId {
    const value = crypto.getRandomValues(new Uint32Array(1))[0] % 900000;
    return String(value + 100000);
  }
}
