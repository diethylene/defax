import { defineConfig } from 'vitest/config';

/** Contract tests: schemas shared by web and api. */
export default defineConfig({
  root: import.meta.dirname,
  resolve: { tsconfigPaths: true },
  test: { include: ['src/**/*.spec.ts'] },
});
