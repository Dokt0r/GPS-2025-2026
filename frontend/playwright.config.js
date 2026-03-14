import { defineConfig } from '@playwright/test';

export default defineConfig({
  // Indicamos explícitamente dónde están los tests E2E
  testDir: './tests',
  // Solo buscar archivos .spec.js
  testMatch: /.*\.spec\.js/,
  
  // Tiempo máximo para cada test individual (útil en GitHub Actions que es más lento)
  timeout: 30000, 

  webServer: [
    {
      // 1. FRONTEND
      command: 'npm run dev',
      url: 'http://localhost:5173', 
      reuseExistingServer: !process.env.CI,
      stdout: 'pipe',
      stderr: 'pipe',
      timeout: 120 * 1000,
    },
    {
      // 2. BACKEND
      command: 'node ../backend/server.js', // <-- Forma más segura de ejecutarlo
      url: 'http://localhost:3000',
      reuseExistingServer: !process.env.CI,
      stdout: 'pipe',
      stderr: 'pipe',
      timeout: 120 * 1000,
    }
  ],
  use: {
    baseURL: 'http://localhost:5173',
  },
});