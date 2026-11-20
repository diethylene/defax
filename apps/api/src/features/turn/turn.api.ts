import { RateLimit } from '@api/core/rate-limit/rate-limit.model';
import { IceServersResponse } from '@contract/turn/ice-servers.model';
import { HttpApiEndpoint, HttpApiGroup, HttpApiSchema } from 'effect/http-api';
import * as Schema from 'effect/Schema';

/** Failure raised when Cloudflare will not mint a TURN credential. */
export class TurnCredentialError extends Schema.TaggedError<TurnCredentialError>()(
  'TurnCredentialError',
  {},
  { httpApiStatus: 502 },
) {}

/** TURN credential endpoints. */
export const TurnApi = HttpApiGroup.make('turn').add(
  HttpApiEndpoint.post('createCredentials', '/turn/credentials', {
    success: IceServersResponse.pipe(HttpApiSchema.status(201)),
    error: TurnCredentialError,
  }).annotate(RateLimit, 10),
);
