import * as Match from 'effect/Match';
import type { ThemeMode } from '../../store/reducers/application-config.reducer';

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
      window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light'
    )
  );

/**
 * Applies a mode to the document root.
 * @param mode Mode to apply.
 */
export const applyMode = (mode: ThemeMode): void => {
  document.documentElement.classList.toggle('dark', mode === 'dark');
};

/**
 * Persists a mode for the next visit.
 * @param mode Mode to persist.
 */
export const persistMode = (mode: ThemeMode): void => {
  localStorage.setItem(STORAGE_KEY, mode);
};
