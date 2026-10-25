import * as Config from 'effect/Config';
import * as Context from 'effect/Context';
import * as Layer from 'effect/Layer';

/** Application settings, read once from the active ConfigProvider. */
export class AppConfig extends Context.Service<
  AppConfig,
  {
    /** Deployed API version, reported by the health endpoint. */
    readonly version: string;
  }
>()('AppConfig', {
  make: Config.all({ version: Config.NonEmptyString('APP_VERSION') }),
}) {
  /** Layer providing AppConfig from the active ConfigProvider. */
  static readonly layer = Layer.effect(AppConfig, AppConfig.make);
}
