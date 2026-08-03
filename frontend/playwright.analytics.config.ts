import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env.E2E_BASE_URL ?? 'http://localhost:3000';

// 분석 화면의 시각·상호작용 QA 전용. 운영 데이터 대신 명시적인 더미 집계를 주입하므로
// 백엔드나 실제 관리자 계정 없이도 PR마다 같은 그래프를 재현할 수 있다.
export default defineConfig({
  testDir: './e2e/analytics',
  fullyParallel: false,
  retries: 0,
  reporter: 'line',
  use: {
    ...devices['Desktop Chrome'],
    baseURL,
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'analytics-visual' }],
  webServer: {
    command: 'npm run dev',
    url: baseURL,
    reuseExistingServer: true,
  },
});

