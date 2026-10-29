import type { Sid } from '@contract/signal/sid.model';

export type { Sid };

export type RoomId = string;

export interface RoomCreated {
  roomId: RoomId;
  sid: Sid;
}
