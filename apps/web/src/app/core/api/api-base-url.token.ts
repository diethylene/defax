import { InjectionToken } from '@angular/core';

/** Origin the web app calls the API on; an empty string means same-origin relative paths. */
export const API_BASE_URL = new InjectionToken<string>('API_BASE_URL', {
  providedIn: 'root',
  factory: () => '',
});
