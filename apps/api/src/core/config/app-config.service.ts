import * as Config from 'effect/Config';
import * as Context from 'effect/Context';
import * as Duration from 'effect/Duration';
import * as Layer from 'effect/Layer';

/**
 * Splits a comma-separated origin allowlist, dropping empty entries.
 * @param value Raw ALLOWED_ORIGIN value; `*` allows every origin.
 * @returns The trimmed origins.
 */
const allowedOriginsFrom = (value: string): readonly string[] =>
  value
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);

/** Application settings, read once from the active ConfigProvider. */
export class AppConfig extends Context.Service<
  AppConfig,
  {
    /** Deployed API version, reported by the health endpoint. */
    readonly version: string;
    /** Rate limit applied to every endpoint unless one overrides it. */
    readonly rateLimit: {
      /** Requests allowed per window. */
      readonly limit: number;
      /** Length of the fixed window. */
      readonly window: Duration.Duration;
    };
    /** Cloudflare Realtime TURN credentials. */
    readonly turn: {
      /** TURN key id; empty when the deployment does not mint credentials. */
      readonly keyId: string;
      /** API token paired with the key; empty when credentials are not minted. */
      readonly apiToken: string;
      /** Credential lifetime in seconds, clamped to Cloudflare's 48 hour maximum. */
      readonly ttlSeconds: number;
    };
    /** Browser access settings. */
    readonly cors: {
      /**
       * Origins allowed to call the API, from ALLOWED_ORIGIN. Defaults to `*`, which sends
       * no credentials. Production must set it to the deployed web origin, comma-separated
       * when more than one origin is allowed.
       */
      readonly allowedOrigins: readonly string[];
    };
  }
>()('AppConfig', {
  make: Config.all({
    version: Config.NonEmptyString('APP_VERSION'),
    rateLimit: Config.all({
      limit: Config.Int('RATE_LIMIT_DEFAULT').pipe(Config.withDefault(30)),
      window: Config.Duration('RATE_LIMIT_WINDOW').pipe(Config.withDefault(Duration.minutes(1))),
    }),
    turn: Config.all({
      keyId: Config.String('TURN_KEY_ID').pipe(Config.withDefault('')),
      apiToken: Config.String('TURN_KEY_API_TOKEN').pipe(Config.withDefault('')),
      ttlSeconds: Config.Int('TURN_CREDENTIAL_TTL').pipe(Config.withDefault(86_400)),
    }),
    cors: Config.all({
      allowedOrigins: Config.String('ALLOWED_ORIGIN').pipe(
        Config.withDefault('*'),
        Config.map(allowedOriginsFrom),
      ),
    }),
  }),
}) {
  /** Layer providing AppConfig from the active ConfigProvider. */
  static readonly layer = Layer.effect(AppConfig, AppConfig.make);
}
