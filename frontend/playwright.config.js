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
      // Usamos 127.0.0.1 en lugar de localhost para evitar problemas de IPv4/IPv6 con Vite en CI
      url: 'http://127.0.0.1:5173', 
      reuseExistingServer: !process.env.CI,
      stdout: 'ignore',
      stderr: 'pipe',
      timeout: 120 * 1000, // Le damos hasta 2 minutos para arrancar en CI
    },
    {
      // 2. BACKEND
      command: 'cd ../backend && node server.js',
      url: 'http://127.0.0.1:3000',
      reuseExistingServer: !process.env.CI,
      stdout: 'ignore',
      stderr: 'pipe',
      timeout: 120 * 1000, // Le damos hasta 2 minutos para arrancar en CI
    }
  ],
  use: {
    // La URL base para los tests (así solo pones page.goto('/') en tus tests)
    baseURL: 'http://127.0.0.1:5173',
  },
});