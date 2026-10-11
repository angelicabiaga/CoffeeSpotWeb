const { defineConfig } = require('@playwright/test');
module.exports = defineConfig({
  testDir: './tests',
  timeout: 90000,
  use: { viewport: { width: 1440, height: 1000 }, headless: true },
  webServer: {
    command: 'npm run dev -w client',
    url: 'http://127.0.0.1:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 30000,
  },
});
