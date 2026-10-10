import type { ThemeMode } from '../../store/reducers/application-config.reducer';

const STORAGE_KEY = 'defax-mode';

export function resolveInitialMode(): ThemeMode {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === 'light' || stored === 'dark') return stored;
  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
}

export function applyMode(mode: ThemeMode): void {
  document.documentElement.classList.toggle('dark', mode === 'dark');
}

export function persistMode(mode: ThemeMode): void {
  localStorage.setItem(STORAGE_KEY, mode);
}
