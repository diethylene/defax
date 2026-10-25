import { Health } from '@contract/health/health.model';
import { HttpApiEndpoint, HttpApiGroup } from 'effect/http-api';

/** Health endpoint; the response schema is shared with the web app. */
export const HealthApi = HttpApiGroup.make('health').add(
  HttpApiEndpoint.get('getHealth', '/api/health', { success: Health }),
);
