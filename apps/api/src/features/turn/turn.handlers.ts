import { AppApi } from '@api/core/http/app.api';
import * as Effect from 'effect/Effect';
import { HttpApiBuilder } from 'effect/http-api';
import { TurnCredential } from './turn-credential.service';

/** Implements the TURN endpoints by delegating to TurnCredential. */
export const TurnHandlers = HttpApiBuilder.group(AppApi, 'turn', (handlers) =>
  Effect.map(TurnCredential, (credential) =>
    handlers.handle('createCredentials', () =>
      Effect.map(credential.mint(), (iceServers) => ({ iceServers })),
    ),
  ),
);
