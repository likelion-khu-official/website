import { chromium, type FullConfig } from '@playwright/test';
import { STORAGE_STATE } from './auth';

interface AdminCredential {
  roleLabel: string;
  email: string;
  password: string;
  storagePath: string;
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `e2e global-setup: 환경변수 ${name}가 없어요. 테스트 대상 서버에 실제로 존재하는 SUPER_ADMIN/ADMIN 계정 정보를 셸(또는 CI 시크릿)에 채워주세요.`
    );
  }
  return value;
}

// 실제 로그인 폼을 통해 브라우저 세션을 만든 뒤 storageState로 저장한다.
// access_token/refresh_token이 HttpOnly 쿠키라 JS로 직접 주입할 수 없어, UI 로그인이 유일한 방법이다.
async function loginAndSaveState(baseURL: string, credential: AdminCredential) {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    await page.goto(`${baseURL}/admin/login`);
    await page.getByLabel('이메일').fill(credential.email);
    await page.getByLabel('비밀번호').fill(credential.password);
    await page.getByRole('button', { name: '로그인' }).click();
    await page.waitForURL(`${baseURL}/admin`, { timeout: 10_000 });
    await context.storageState({ path: credential.storagePath });
  } catch (err) {
    throw new Error(
      `e2e global-setup: ${credential.roleLabel} 로그인에 실패했어요 (${credential.email}). 계정 정보 또는 백엔드 상태를 확인해주세요.\n원인: ${err instanceof Error ? err.message : String(err)}`
    );
  } finally {
    await browser.close();
  }
}

export default async function globalSetup(config: FullConfig) {
  const baseURL = config.projects[0]?.use.baseURL ?? 'http://localhost:3000';

  await loginAndSaveState(baseURL, {
    roleLabel: 'SUPER_ADMIN',
    email: requireEnv('E2E_SUPER_ADMIN_EMAIL'),
    password: requireEnv('E2E_SUPER_ADMIN_PASSWORD'),
    storagePath: STORAGE_STATE.superAdmin,
  });

  await loginAndSaveState(baseURL, {
    roleLabel: 'ADMIN',
    email: requireEnv('E2E_ADMIN_EMAIL'),
    password: requireEnv('E2E_ADMIN_PASSWORD'),
    storagePath: STORAGE_STATE.admin,
  });

  // 방문자(비로그인) — 빈 세션도 동일하게 storageState 파일로 남겨 3개 role을 같은 방식으로 다룬다.
  const browser = await chromium.launch();
  const context = await browser.newContext();
  await context.storageState({ path: STORAGE_STATE.visitor });
  await browser.close();
}
