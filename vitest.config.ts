import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    testTimeout: 5000,
    typecheck: {
      tsconfig: './tsconfig.test.json',
    },
  },
});
