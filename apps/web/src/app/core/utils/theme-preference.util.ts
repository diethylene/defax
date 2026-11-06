import * as Match from 'effect/Match';
import type { ThemeMode } from '../../store/application-config/application-config.reducer';

/** Local storage key holding the persisted theme mode. */
const STORAGE_KEY = 'defax-mode';

/**
 * Resolves the mode to start with from storage or the system preference.
 * @returns The stored mode, or the system preference when nothing is stored.
 */
export const resolveInitialMode = (): ThemeMode =>
  Match.value(localStorage.getItem(STORAGE_KEY)).pipe(
    Match.when('light', () => 'light' as const),
    Match.when('dark', () => 'dark' as const),
    Match.orElse(() =>
      window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light',
    ),
  );

/**
 * Applies a mode to the document root.
 * @param mode Mode to apply.
 */
export const applyMode = (mode: ThemeMode): void => {
  document.documentElement.classList.toggle('dark', mode === 'dark');
};

/**
 * Applies a mode behind a view transition so the change wipes in.
 * @param mode Mode to apply.
 */
export const transitionMode = (mode: ThemeMode): void => {
  if (!document.startViewTransition) {
    applyMode(mode);
    return;
  }

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    applyMode(mode);
    return;
  }

  const root = document.documentElement;
  root.setAttribute('data-theme-transition', '');
  const transition = document.startViewTransition(() => applyMode(mode));
  const clearFlag = (): void => root.removeAttribute('data-theme-transition');
  void transition.finished.then(clearFlag, clearFlag);
};

/**
 * Persists a mode for the next visit.
 * @param mode Mode to persist.
 */
export const persistMode = (mode: ThemeMode): void => {
  localStorage.setItem(STORAGE_KEY, mode);
};
