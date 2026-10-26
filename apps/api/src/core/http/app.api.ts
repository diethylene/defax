import { HealthApi } from '@api/features/health/health.api';
import { RoomsApi } from '@api/features/rooms/rooms.api';
import { HttpApi } from 'effect/http-api';

/** The application's full HTTP API, composed from feature groups. */
export const AppApi = HttpApi.make('app').add(HealthApi).add(RoomsApi);
