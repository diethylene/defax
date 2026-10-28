import { Directionality } from '@angular/cdk/bidi';
import { DOCUMENT } from '@angular/common';
import {
  APP_INITIALIZER,
  type ApplicationConfig,
  inject,
  isDevMode,
  provideBrowserGlobalErrorListeners
} from '@angular/core';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideRouter, withViewTransitions } from '@angular/router';
import { provideEffects } from '@ngrx/effects';
import { provideRouterStore, routerReducer } from '@ngrx/router-store';
import { provideStore, Store } from '@ngrx/store';
import { provideSpartanHlm } from '@spartan-ng/helm/utils';
import { routes } from './app.routes';
import { BroadcastChannelTransport } from './core/services/broadcast-channel-transport';
import { navDirection } from './core/services/navigation-direction';
import { ServerTransport } from './core/services/server-transport';
import {
  applyMode,
  resolveInitialMode
} from './core/services/theme-preference';
import { SignalTransport } from './shared/interfaces/signal-transport';
import { provideMaskedUrls } from './shared/services/masking-location-strategy';
import { ApplicationConfigActions } from './store/application-config/application-config.actions';
import {
  applyThemeMode$,
  persistThemeMode$
} from './store/application-config/application-config.effects';
import { applicationConfigFeature } from './store/application-config/application-config.reducer';
import { ReceiveEffects } from './store/effects/receive.effects';
import { SendEffects } from './store/effects/send.effects';
import { receiveReducer } from './store/reducers/receive.reducer';
import { sendReducer } from './store/reducers/send.reducer';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideAnimationsAsync(),
    provideStore({
      applicationConfig: applicationConfigFeature.reducer,
      send: sendReducer,
      receive: receiveReducer,
      router: routerReducer
    }),
    provideEffects(
      { applyThemeMode$, persistThemeMode$ },
      SendEffects,
      ReceiveEffects
    ),
    provideRouter(
      routes,
      withViewTransitions({
        skipInitialTransition: true,
        onViewTransitionCreated: ({ from, to }) => {
          const document = inject(DOCUMENT);
          document.documentElement.setAttribute(
            'data-nav-direction',
            navDirection(from, to)
          );
        }
      })
    ),
    provideMaskedUrls('/send', '/receive'),
    provideRouterStore(),
    provideSpartanHlm(),
    {
      provide: SignalTransport,
      useClass: isDevMode() ? BroadcastChannelTransport : ServerTransport
    },
    { provide: Directionality, useClass: Directionality },
    {
      provide: APP_INITIALIZER,
      useFactory:
        (store = inject(Store)) =>
        () => {
          const mode = resolveInitialMode();
          applyMode(mode);
          store.dispatch(ApplicationConfigActions.setMode({ mode }));
        },
      multi: true
    }
  ]
};
