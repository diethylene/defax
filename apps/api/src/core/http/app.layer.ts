import { AppConfig } from '@api/core/config/app-config.service';
import { ApiEnvelopeMiddleware } from '@api/core/http/api-envelope.middleware';
import { AppApi } from '@api/core/http/app.api';
import { HealthHandlers } from '@api/features/health/health.handlers';
import { RoomsHandlers } from '@api/features/rooms/rooms.handlers';
import { HttpServer } from 'effect/http';
import { HttpApiBuilder } from 'effect/http-api';
import * as Layer from 'effect/Layer';

/** The whole app as one layer; the runtime entry point supplies the config and the room namespace. */
export const AppLayer = HttpApiBuilder.layer(AppApi).pipe(
  Layer.provide(HealthHandlers),
  Layer.provide(RoomsHandlers),
  Layer.provide(ApiEnvelopeMiddleware.layer),
  Layer.provide(AppConfig.layer),
  Layer.provide(HttpServer.layerServices),
);
