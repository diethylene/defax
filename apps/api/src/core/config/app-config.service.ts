import * as Config from 'effect/Config';
import * as Context from 'effect/Context';
import * as Duration from 'effect/Duration';
import * as Layer from 'effect/Layer';

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
  }
>()('AppConfig', {
  make: Config.all({
    version: Config.NonEmptyString('APP_VERSION'),
    rateLimit: Config.all({
      limit: Config.Int('RATE_LIMIT_DEFAULT').pipe(Config.withDefault(30)),
      window: Config.Duration('RATE_LIMIT_WINDOW').pipe(Config.withDefault(Duration.minutes(1))),
    }),
  }),
}) {
  /** Layer providing AppConfig from the active ConfigProvider. */
  static readonly layer = Layer.effect(AppConfig, AppConfig.make);
}
