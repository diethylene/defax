import { AppConfig } from '@api/core/config/app-config.service';
import { type IceServer, IceServersResponse } from '@contract/turn/ice-servers.model';
import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import { pipe } from 'effect/Function';
import { HttpClient, HttpClientRequest, HttpClientResponse } from 'effect/http';
import * as Layer from 'effect/Layer';
import * as Option from 'effect/Option';
import { TurnCredentialError } from './turn.api';

/** An ICE server in the shape the web app hands to RTCPeerConnection. */
export interface RtcIceServer {
  /** STUN or TURN URLs. */
  readonly urls: readonly string[];
  /** TURN username, absent on STUN entries. */
  readonly username?: string;
  /** TURN credential, absent on STUN entries. */
  readonly credential?: string;
}

/** Cloudflare's generate-ice-servers endpoint. */
const CREDENTIALS_URL = 'https://rtc.live.cloudflare.com/v1/turn/keys';

/** Longest TTL Cloudflare accepts for a TURN credential, 48 hours. */
const MAX_TTL_SECONDS = 172_800;

/** Shortest TTL sent; Cloudflare rejects non-positive values. */
const MIN_TTL_SECONDS = 1;

/** App configuration the service reads. */
type Config = Context.Service.Shape<typeof AppConfig>;

/**
 * Builds the credential URL for one TURN key.
 * @param keyId TURN key id from the environment.
 * @returns The generate-ice-servers URL.
 */
const credentialsUrl = (keyId: string): string =>
  `${CREDENTIALS_URL}/${encodeURIComponent(keyId)}/credentials/generate-ice-servers`;

/**
 * Keeps a configured TTL inside the range Cloudflare accepts.
 * @param ttlSeconds Configured credential lifetime.
 * @returns The TTL to send.
 */
const clampTtl = (ttlSeconds: number): number =>
  Math.min(Math.max(ttlSeconds, MIN_TTL_SECONDS), MAX_TTL_SECONDS);

/**
 * Maps a decoded Cloudflare server to the app's readonly shape, dropping absent fields.
 * @param server Decoded server entry.
 * @returns The ICE server to send to clients.
 */
const toRtcIceServer = (server: IceServer): RtcIceServer =>
  Option.match(Option.fromNullishOr(server.credential), {
    onNone: () =>
      Option.match(Option.fromNullishOr(server.username), {
        onNone: () => ({ urls: server.urls }),
        onSome: (username) => ({ urls: server.urls, username }),
      }),
    onSome: (credential) =>
      Option.match(Option.fromNullishOr(server.username), {
        onNone: () => ({ urls: server.urls, credential }),
        onSome: (username) => ({ urls: server.urls, username, credential }),
      }),
  });

/**
 * Calls Cloudflare and decodes the credential response.
 * @param client HTTP client supplied by the app layer.
 * @param config App configuration with the TURN key and token.
 * @returns The ICE servers to hand to clients.
 */
const mintWith = (
  client: HttpClient.HttpClient,
  config: Config,
): Effect.Effect<readonly RtcIceServer[], TurnCredentialError> =>
  Effect.gen(function* () {
    const request = yield* pipe(
      HttpClientRequest.post(credentialsUrl(config.turn.keyId)),
      HttpClientRequest.bearerToken(config.turn.apiToken),
      HttpClientRequest.bodyJson({ ttl: clampTtl(config.turn.ttlSeconds) }),
    );
    const response = yield* client.execute(request);
    const ok = yield* HttpClientResponse.filterStatusOk(response);
    const body = yield* HttpClientResponse.schemaBodyJson(IceServersResponse)(ok);
    return body.iceServers.map(toRtcIceServer);
  }).pipe(
    Effect.catchTags({
      HttpClientError: () => Effect.fail(new TurnCredentialError()),
      SchemaError: () => Effect.fail(new TurnCredentialError()),
      HttpBodyError: () => Effect.fail(new TurnCredentialError()),
    }),
  );

/** Mints short-lived Cloudflare TURN credentials. */
export class TurnCredential extends Context.Service<
  TurnCredential,
  {
    /** Mints a short-lived TURN credential from Cloudflare. */
    readonly mint: () => Effect.Effect<readonly RtcIceServer[], TurnCredentialError>;
  }
>()('TurnCredential', {
  make: Effect.map(
    Effect.all({ config: AppConfig, client: HttpClient.HttpClient }),
    ({ config, client }) => ({ mint: () => mintWith(client, config) }),
  ),
}) {
  /** Layer providing the service; requires AppConfig and HttpClient. */
  static readonly layer = Layer.effect(TurnCredential, TurnCredential.make);
}
