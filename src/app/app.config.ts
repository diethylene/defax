import {
  APP_INITIALIZER,
  type ApplicationConfig,
  inject,
  provideBrowserGlobalErrorListeners
} from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideEffects } from '@ngrx/effects';
import { provideStore, Store } from '@ngrx/store';
import { provideSpartanHlm } from '@spartan-ng/helm/utils';
import { routes } from './app.routes';
import {
  applyMode,
  resolveInitialMode
} from './core/services/theme-preference';
import { setMode } from './store/actions/application-config.actions';
import { ApplicationConfigEffects } from './store/effects/application-config.effects';
import { applicationConfigReducer } from './store/reducers/application-config.reducer';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideStore({ applicationConfig: applicationConfigReducer }),
    provideEffects(ApplicationConfigEffects),
    provideRouter(routes),
    provideSpartanHlm(),
    {
      provide: APP_INITIALIZER,
      useFactory:
        (store = inject(Store)) =>
        () => {
          const mode = resolveInitialMode();
          applyMode(mode);
          store.dispatch(setMode({ mode }));
        },
      multi: true
    }
  ]
};
