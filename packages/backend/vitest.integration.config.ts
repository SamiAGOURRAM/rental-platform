import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.integration.test.ts', 'src/**/*.routes.test.ts'],
    testTimeout: 30000,
    setupFiles: ['src/test-setup.integration.ts'],
  },
});
