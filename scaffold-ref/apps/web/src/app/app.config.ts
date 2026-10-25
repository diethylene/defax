import { type ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideEffects } from '@ngrx/effects';
import { provideStore } from '@ngrx/store';
import * as healthEffects from '@web/store/health/health.effects';
import { healthFeature } from '@web/store/health/health.reducer';
import { appRoutes } from './app.routes';

/** Root providers: router, global store, and effects. */
export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(appRoutes, withComponentInputBinding()),
    provideStore({ [healthFeature.name]: healthFeature.reducer }),
    provideEffects(healthEffects),
  ],
};
