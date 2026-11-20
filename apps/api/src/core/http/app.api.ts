import { ApiEnvelopeMiddleware } from '@api/core/http/api-envelope.middleware';
import { CorsMiddleware } from '@api/core/http/cors.middleware';
import { RateLimitMiddleware } from '@api/core/http/rate-limit.middleware';
import { HealthApi } from '@api/features/health/health.api';
import { RoomsApi } from '@api/features/rooms/rooms.api';
import { TurnApi } from '@api/features/turn/turn.api';
import { HttpApi } from 'effect/http-api';

/** The application's full HTTP API, composed from feature groups. */
export const AppApi = HttpApi.make('app')
  .add(HealthApi)
  .add(RoomsApi)
  .add(TurnApi)
  .middleware(ApiEnvelopeMiddleware)
  .middleware(RateLimitMiddleware)
  .middleware(CorsMiddleware);
