import { test, expect } from '@playwright/test';
import { STORAGE_STATE } from './auth';

// 단일 관리자 모델(#293) 회귀 방지 — 실제 브라우저에서 고정한다.
// 예전에는 "새 관리자 초대"가 최고관리자에게만 허용됐지만, 지금은 역할 구분이 사라져
// 로그인한 모든 관리자가 같은 권한을 가진다. 이 테스트는 그 단순함이 다시 2단계 권한으로
// 되돌아가지 않았는지(초대가 특정 역할에만 열려 있거나, 역할 배지·역할 변경 UI가 살아나지
// 않았는지)를 관리자 계정 화면(/admin/admins)에서 검증한다.
//
// projects의 기본 storageState 대신 test.use()로 세션을 명시적으로 덮어써서
// 여러 로그인 상태를 한 파일에서 나란히 비교한다.
test.describe('관리자 계정 화면 — 단일 관리자 권한', () => {
  // 예전 SUPER_ADMIN 계정도 이제는 그냥 "관리자" 한 종류다 — 둘 다 초대가 보여야 한다.
  const adminSessions = [
    { label: '관리자', storageState: STORAGE_STATE.admin },
    { label: '예전 최고관리자 계정', storageState: STORAGE_STATE.superAdmin },
  ] as const;

  for (const { label, storageState } of adminSessions) {
    test.describe(label, () => {
      test.use({ storageState });

      test('초대 어포던스가 보이고 역할 구분 UI는 없다', async ({ page }) => {
        await page.goto('/admin/admins');

        // 모든 관리자가 새 관리자를 초대할 수 있다 (예전엔 최고관리자 전용이었다).
        await expect(page.getByRole('button', { name: '초대 보내기' })).toBeVisible();

        // 역할 배지·역할 변경 드롭다운이 되살아나지 않았는지 확인한다.
        await expect(page.getByText('최고관리자')).toHaveCount(0);
        await expect(page.getByRole('combobox')).toHaveCount(0);
      });
    });
  }

  test.describe('비로그인 방문자', () => {
    test.use({ storageState: STORAGE_STATE.visitor });

    test('관리자 화면에 접근하면 로그인 화면으로 보내진다', async ({ page }) => {
      await page.goto('/admin/admins');

      // 세션이 없으면 보호 셸이 로그인으로 돌려보낸다 — 관리자 동작에 접근할 수 없다.
      await page.waitForURL('**/admin/login', { timeout: 10_000 });
      await expect(page.getByRole('button', { name: '초대 보내기' })).toHaveCount(0);
    });
  });
});
