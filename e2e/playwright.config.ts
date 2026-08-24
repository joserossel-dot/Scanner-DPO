import { defineConfig } from '@playwright/test';

const apiUrl = process.env.E2E_API_URL;

if (!apiUrl) {
  throw new Error('E2E_API_URL is required. Point it to an isolated test or staging API.');
}

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  timeout: 90_000,
  expect: { timeout: 10_000 },
  reporter: process.env.CI ? [['github'], ['list']] : 'list',
  use: {
    baseURL: apiUrl.replace(/\/$/, ''),
    extraHTTPHeaders: {
      Accept: 'application/json'
    }
  }
});
