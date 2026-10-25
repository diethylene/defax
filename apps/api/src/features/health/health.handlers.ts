import { AppConfig } from '@api/core/config/app-config.service';
import { AppApi } from '@api/core/http/app.api';
import * as Effect from 'effect/Effect';
import { HttpApiBuilder } from 'effect/http-api';

/** Implements the health endpoint from configuration alone. */
export const HealthHandlers = HttpApiBuilder.group(AppApi, 'health', (handlers) =>
  Effect.map(AppConfig, ({ version }) =>
    handlers.handle('getHealth', () => Effect.succeed({ status: 'ok' as const, version })),
  ),
);
