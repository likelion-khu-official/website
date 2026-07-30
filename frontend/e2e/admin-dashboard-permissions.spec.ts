import { test, expect } from '@playwright/test';
import { STORAGE_STATE } from './auth';

// "+ 초대" 버튼은 AdminDashboard에서 isSuperAdmin일 때만 렌더링된다 — role 분기가 실제로 지켜지는지 확인.
// projects의 기본 storageState 대신 test.use()로 role별 storageState를 명시적으로 덮어써서
// 두 role을 한 파일에서 나란히 비교한다.
test.describe('어드민 대시보드 — role별 버튼 노출', () => {
  test.describe('SUPER_ADMIN', () => {
    test.use({ storageState: STORAGE_STATE.superAdmin });

    test('"+ 초대" 버튼이 보인다', async ({ page }) => {
      await page.goto('/admin');

      await expect(page.getByRole('button', { name: '+ 초대' })).toBeVisible();
    });
  });

  test.describe('ADMIN', () => {
    test.use({ storageState: STORAGE_STATE.admin });

    test('"+ 초대" 버튼이 안 보인다', async ({ page }) => {
      await page.goto('/admin');

      await expect(page.getByRole('button', { name: '+ 초대' })).toHaveCount(0);
    });
  });
});
