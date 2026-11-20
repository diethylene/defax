import { AppConfig } from '@api/core/config/app-config.service';
import { ApiEnvelopeMiddleware } from '@api/core/http/api-envelope.middleware';
import { AppApi } from '@api/core/http/app.api';
import { CorsMiddleware } from '@api/core/http/cors.middleware';
import { RateLimitMiddleware } from '@api/core/http/rate-limit.middleware';
import { RateLimiter } from '@api/core/rate-limit/rate-limit.service';
import { HealthHandlers } from '@api/features/health/health.handlers';
import { RoomsHandlers } from '@api/features/rooms/rooms.handlers';
import { TurnHandlers } from '@api/features/turn/turn.handlers';
import { TurnCredential } from '@api/features/turn/turn-credential.service';
import { FetchHttpClient, HttpServer } from 'effect/http';
import { HttpApiBuilder } from 'effect/http-api';
import * as Layer from 'effect/Layer';

/** The whole app as one layer; the runtime entry point supplies the config and the namespace bindings. */
export const AppLayer = HttpApiBuilder.layer(AppApi).pipe(
  Layer.provide(HealthHandlers),
  Layer.provide(RoomsHandlers),
  Layer.provide(TurnHandlers),
  Layer.provide(TurnCredential.layer.pipe(Layer.provide(FetchHttpClient.layer))),
  Layer.provide(ApiEnvelopeMiddleware.layer),
  Layer.provide(RateLimitMiddleware.layer),
  Layer.provide(CorsMiddleware.layer),
  Layer.provide(RateLimiter.layer),
  Layer.provide(AppConfig.layer),
  Layer.provide(HttpServer.layerServices),
);
