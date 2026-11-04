import { AppApi } from '@api/core/http/app.api';
import { sidFromBytes } from '@contract/signal/sid.model';
import * as Effect from 'effect/Effect';
import { HttpApiBuilder } from 'effect/http-api';
import { generateRoomCode } from './room-code.util';
import { RoomCreationFailed } from './rooms.api';
import { RoomsNamespace } from './rooms-namespace.service';

/** Creates a room and initializes its Durable Object. */
const createRoom = Effect.gen(function* () {
  const { namespace } = yield* RoomsNamespace;
  const roomId = generateRoomCode();
  const sid = sidFromBytes(crypto.getRandomValues(new Uint8Array(16)));
  const stub = namespace.get(namespace.idFromName(roomId));
  const response = yield* Effect.tryPromise({
    try: () => stub.fetch('https://room/init', { method: 'POST', body: sid }),
    catch: () => new RoomCreationFailed(),
  });
  if (response.status !== 204) return yield* new RoomCreationFailed();
  return { roomId, sid };
});

/** Implements the rooms endpoints. */
export const RoomsHandlers = HttpApiBuilder.group(AppApi, 'rooms', (handlers) =>
  Effect.map(RoomsNamespace, (rooms) =>
    handlers.handle('createRoom', () =>
      createRoom.pipe(Effect.provideService(RoomsNamespace, rooms)),
    ),
  ),
);
