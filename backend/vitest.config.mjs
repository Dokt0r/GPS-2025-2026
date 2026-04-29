import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['dotenv/config'],
    testTimeout: 30000,
    coverage: {
      provider: 'istanbul',
      reporter: 'html',
      reportsDirectory: './test-report/coverage',
      include: ['src/**']
    },
    reporters: [
      'default',
      ['html', { outputFile: './test-report/index.html' }],
    ],
    pool: 'forks',
    fileParallelism: false,
  }
})