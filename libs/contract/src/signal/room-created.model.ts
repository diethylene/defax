import * as Schema from 'effect/Schema';
import { RoomId } from './room-id.model';
import { Sid } from './sid.model';

/** Body returned when a room is created. */
export const RoomCreated = Schema.Struct({
  /** Six-digit room code the responder enters. */
  roomId: RoomId,
  /** Session id the initiator must present to claim the initiator role. */
  sid: Sid,
});

/** A validated room creation response. */
export type RoomCreated = typeof RoomCreated.Type;
