import path from 'node:path';
import { expect, test } from '@playwright/test';

const evidenceDir = path.resolve(__dirname, '../../../pm/missions/381-admin-analytics-pageviews/evidence');

const series = Array.from({ length: 30 }, (_, index) => ({
  date: `2026-07-${String(index + 4).padStart(2, '0')}`.replace('2026-07-32', '2026-08-01').replace('2026-07-33', '2026-08-02'),
  views: [12, 15, 11, 18, 24, 20, 19, 26, 31, 28, 35, 34, 41, 38, 45, 52, 49, 57, 53, 60, 68, 63, 72, 77, 70, 81, 86, 79, 92, 104][index],
}));

test.beforeEach(async ({ context, page }) => {
  await context.addCookies([{ name: 'access_token', value: 'visual-qa-token', domain: 'localhost', path: '/' }]);
  await page.route('**/api/admin/auth/refresh', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ admin: { id: 1, name: '김운영', email: 'admin@example.com' } }),
    });
  });
  await page.route('**/api/admin/analytics/pageviews**', async (route) => {
    const selectedPage = new URL(route.request().url()).searchParams.get('page');
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        range: { from: '2026-07-04', to: '2026-08-02', interval: 'day', timezone: 'Asia/Seoul' },
        totalViews: selectedPage ? 426 : 1_474,
        series: series.map((point) => ({ ...point, views: selectedPage ? Math.round(point.views * 0.29) : point.views })),
        pages: [
          { path: '/', views: 583 },
          { path: '/projects', views: 426 },
          { path: '/blog', views: 281 },
          { path: '/recruit', views: 184 },
        ],
      }),
    });
  });
  await page.route('**/api/analytics/pageviews', async (route) => {
    await route.fulfill({ status: 204, body: '' });
  });
});

test('비개발자용 데스크톱 화면과 표준 hover tooltip을 확인한다', async ({ page }) => {
  await page.goto('/admin/analytics?from=2026-07-04&to=2026-08-02&interval=day');

  await expect(page.getByRole('heading', { name: '사이트 이용 현황' })).toBeVisible();
  await expect(page.getByText('1,474')).toBeVisible();
  await expect(page.getByRole('img', { name: /전체 페이지 조회수 기간별 선 그래프/ })).toBeVisible();
  await expect(page.getByText('프로젝트 목록')).toBeVisible();

  await page.screenshot({ path: path.join(evidenceDir, 'desktop-overview.png'), fullPage: true });

  const chart = page.getByRole('img', { name: /전체 페이지 조회수 기간별 선 그래프/ });
  const box = await chart.boundingBox();
  if (!box) throw new Error('그래프 위치를 확인할 수 없어요.');
  await page.mouse.move(box.x + box.width * 0.82, box.y + box.height * 0.42);
  await page.waitForTimeout(150);
  await page.screenshot({ path: path.join(evidenceDir, 'desktop-hover-tooltip.png'), fullPage: true });

  await page.getByRole('button', { name: /^프로젝트 목록/ }).click();
  await expect(page).toHaveURL(/page=%2Fprojects/);
});

test('390px 모바일에서 기간·그래프·표가 화면 밖으로 밀리지 않는다', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/admin/analytics?from=2026-07-04&to=2026-08-02&interval=day');
  await expect(page.getByText('1,474')).toBeVisible();

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(1);
  await page.screenshot({ path: path.join(evidenceDir, 'mobile-overview.png'), fullPage: true });
});
