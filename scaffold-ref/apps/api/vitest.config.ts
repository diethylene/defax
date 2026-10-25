import { defineConfig } from 'vitest/config';

/** API unit tests run in Node against the same layers the Worker serves. */
export default defineConfig({
  root: import.meta.dirname,
  resolve: { tsconfigPaths: true },
  test: { include: ['src/**/*.spec.ts'] },
});
