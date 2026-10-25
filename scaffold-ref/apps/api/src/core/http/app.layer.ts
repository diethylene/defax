import { AppConfig } from '@api/core/config/app-config.service';
import { AppApi } from '@api/core/http/app.api';
import { HealthHandlers } from '@api/features/health/health.handlers';
import { HttpServer } from 'effect/http';
import { HttpApiBuilder } from 'effect/http-api';
import * as Layer from 'effect/Layer';

/** The whole app as one layer; the runtime entry point supplies only the ConfigProvider. */
export const AppLayer = HttpApiBuilder.layer(AppApi).pipe(
  Layer.provide(HealthHandlers),
  Layer.provide(AppConfig.layer),
  Layer.provide(HttpServer.layerServices),
);
