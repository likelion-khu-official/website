import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { expect, test } from '@playwright/test';
import { STORAGE_STATE } from './auth';

const SCREENSHOT_DIR = path.join(__dirname, 'screenshots');

test.describe('댓글 검열 해피패스', () => {
  test.use({ storageState: STORAGE_STATE.admin });

  test('관리자가 추적 정보를 보고 댓글을 가린 뒤 공개 자리 표시를 확인한다', async ({ page }) => {
    mkdirSync(SCREENSHOT_DIR, { recursive: true });
    await page.setViewportSize({ width: 1440, height: 1000 });

    await page.goto('/admin/comments');
    await expect(page.getByRole('heading', { name: '댓글 검열' })).toBeVisible();
    await expect(page.getByText('익명 AAAAAAAA').first()).toBeVisible();
    await expect(page.getByText('이 브라우저 댓글 2개').first()).toBeVisible();

    page.once('dialog', (dialog) => dialog.accept('QA: 운영 정책 위반'));
    await page.getByRole('button', { name: '댓글 가리기' }).last().click();
    await expect(page.getByRole('status')).toContainText('댓글을 가렸습니다.');
    await expect(page.locator('span').filter({ hasText: /^가려짐$/ }).last()).toBeVisible();
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'comment-moderation-admin.png'),
      fullPage: true,
    });

    await page.goto('/blog/qa-comment-moderation');
    await expect(page.getByText('관리자에 의해 가려진 댓글입니다.')).toBeVisible();
    await expect(page.getByText('검열 테스트 대상 익명 댓글입니다.')).toHaveCount(0);
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'comment-moderation-public.png'),
      fullPage: true,
    });

    await page.goto('/admin/comments');
    page.once('dialog', (dialog) => dialog.accept());
    await page.getByRole('button', { name: '다시 공개' }).click();
    await expect(page.getByRole('status')).toContainText('댓글을 다시 공개했습니다.');
  });
});
