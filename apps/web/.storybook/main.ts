import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { StorybookConfig } from '@storybook/angular-vite';

const workspaceRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const spartan = (name: string): string => resolve(workspaceRoot, `libs/ui/${name}/src/index.ts`);

/** Storybook for the web app's shared components. */
const config: StorybookConfig = {
  stories: ['../src/**/*.stories.ts'],
  addons: ['@storybook/addon-a11y', '@storybook/addon-docs'],
  framework: '@storybook/angular-vite',
  async viteFinal(config) {
    // Vite/Rolldown does not resolve the relative tsconfig path aliases the way
    // the Angular build does, so register them here as absolute paths.
    config.resolve = config.resolve ?? {};
    config.resolve.alias = {
      ...(config.resolve.alias ?? {}),
      '@spartan-ng/helm/button': spartan('button'),
      '@spartan-ng/helm/utils': spartan('utils'),
      '@spartan-ng/helm/card': spartan('card'),
      '@spartan-ng/helm/input': spartan('input'),
      '@spartan-ng/helm/label': spartan('label'),
      '@spartan-ng/helm/badge': spartan('badge'),
      '@spartan-ng/helm/sonner': spartan('sonner'),
      '@spartan-ng/helm/progress': spartan('progress'),
      '@spartan-ng/helm/spinner': spartan('spinner'),
      '@spartan-ng/helm/separator': spartan('separator'),
      '@spartan-ng/helm/skeleton': spartan('skeleton'),
      '@contract/': `${resolve(workspaceRoot, 'libs/contract/src')}/`,
      '@web/core/': `${resolve(workspaceRoot, 'apps/web/src/app/core')}/`,
      '@web/shared/': `${resolve(workspaceRoot, 'apps/web/src/app/shared')}/`,
      '@web/features/': `${resolve(workspaceRoot, 'apps/web/src/app/features')}/`,
      '@web/store/': `${resolve(workspaceRoot, 'apps/web/src/app/store')}/`,
    };
    return config;
  },
};

export default config;
