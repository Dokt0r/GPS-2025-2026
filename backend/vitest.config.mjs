import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['dotenv/config'],
    testTimeout: 30000,
    reporters: [
      'default',
      ['html', { outputFile: './test-report/index.html' }],
    ],
    pool: 'threads',
  }
})
