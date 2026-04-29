import { defineConfig } from 'vitest/config'
import SourceReporter from '../reporters/sourceReporter.mjs'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['dotenv/config'],
    testTimeout: 30000,
    reporters: [
      'default',
      ['html', { outputFile: './test-report/index.html' }],
      new SourceReporter({ outputFile: './test-report/source-report.html', title: 'Backend — Reporte con Código Fuente' }),
    ],
    pool: 'forks',
    fileParallelism: false,
  }
})