import { defineConfig, devices } from '@playwright/test';
import { STORAGE_STATE } from './e2e/auth';

const baseURL = process.env.E2E_BASE_URL ?? 'http://localhost:3000';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: 'html',
  globalSetup: './e2e/global-setup.ts',

  use: {
    baseURL,
    trace: 'on-first-retry',
  },

  // 로그인 상태별로 분리 — 테스트는 필요한 role의 project로 돌리거나,
  // 한 파일 안에서 role을 비교해야 하면 STORAGE_STATE를 직접 참조해 context를 새로 연다.
  projects: [
    {
      name: 'visitor',
      use: { ...devices['Desktop Chrome'], storageState: STORAGE_STATE.visitor },
    },
    {
      name: 'admin',
      use: { ...devices['Desktop Chrome'], storageState: STORAGE_STATE.admin },
    },
    {
      name: 'super-admin',
      use: { ...devices['Desktop Chrome'], storageState: STORAGE_STATE.superAdmin },
    },
  ],

  // 백엔드는 별도로 떠 있어야 한다(.env.local의 BACKEND_URL) — 여기서는 프론트 dev 서버만 띄운다.
  webServer: {
    command: 'npm run dev',
    url: baseURL,
    reuseExistingServer: !process.env.CI,
  },
});
