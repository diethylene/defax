import { AppApi } from '@api/core/http/app.api';
import * as Effect from 'effect/Effect';
import { HttpApiBuilder } from 'effect/http-api';

/** Implements the rooms endpoints; create answers a fixed stub room. */
export const RoomsHandlers = HttpApiBuilder.group(AppApi, 'rooms', (handlers) =>
  Effect.succeed(
    handlers.handle('createRoom', () => Effect.succeed({ id: 'stub', status: 'created' as const })),
  ),
);
