import { defineConfig } from 'vitest/config';

/** API unit tests run in Node against the same layers the Worker serves. */
export default defineConfig({
  root: import.meta.dirname,
  resolve: {
    tsconfigPaths: true,
    alias: { 'cloudflare:workers': './src/features/room/cloudflare-workers.ts' },
  },
  test: { include: ['src/**/*.spec.ts'] },
});
