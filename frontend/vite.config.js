import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import SourceReporter from '../reporters/sourceReporter.mjs'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/setupTests.js',
    exclude: ['**/node_modules/**', '**/tests/**'],
    reporters: [
      'default',
      ['html', { outputFile: './test-report/index.html' }],
      new SourceReporter({ outputFile: './test-report/source-report.html', title: 'Backend — Reporte con Código Fuente' }),
    ],
  }
})

