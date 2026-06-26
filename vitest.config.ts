import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
    resetMocks: true, // resets implementations + queues between each test (not just call history)
  },
});
