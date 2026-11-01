import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/browser',
  outputDir: '../.ui-review/redesign/test-results',
  fullyParallel: false,
  workers: 1,
  timeout: 45000,
  expect: { timeout: 10000 },
  reporter: [['list'], ['json', { outputFile: '../.ui-review/redesign/results.json' }]],
  use: {
    baseURL: 'http://localhost:4174',
    channel: 'chrome',
    viewport: { width: 1440, height: 1000 },
    timezoneId: 'Asia/Ho_Chi_Minh',
    locale: 'vi-VN',
    reducedMotion: 'reduce',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    launchOptions: { args: ['--enable-webgl', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] },
  },
  webServer: {
    command: 'npm run preview -- --host localhost',
    url: 'http://localhost:4174',
    reuseExistingServer: !process.env.CI,
  },
});
