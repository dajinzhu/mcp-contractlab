import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: {
    include: ['tests/independent/**/*.test.ts'],
    testTimeout: 20_000,
    maxWorkers: 1,
  },
});
