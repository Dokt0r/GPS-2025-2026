import { defineConfig } from '@playwright/test';

export default defineConfig({
  // INDICAR EXPLÍCITAMENTE DONDE ESTÁN LOS TESTS E2E
  testDir: './tests',
  // SOLO BUSCAR ARCHIVOS .spec.js
  testMatch: /.*\.spec\.js/,

  webServer: [
    {
      command: 'npm run dev',
      url: 'http://localhost:5173',
      reuseExistingServer: !process.env.CI,
      stdout: 'ignore',
      stderr: 'pipe',
    },
    {
      command: 'cd ../backend && node server.js',
      url: 'http://localhost:3000',
      reuseExistingServer: !process.env.CI,
      stdout: 'ignore',
      stderr: 'pipe',
    }
  ],
  use: {
    baseURL: 'http://localhost:5173',
  },
});