import path from 'node:path';
import { expect, test } from '@playwright/test';

const evidenceDir = path.resolve(__dirname, '../../../pm/missions/381-admin-analytics-pageviews/evidence');
const blogEvidenceDir = path.resolve(__dirname, '../../../pm/missions/382-admin-analytics-blog-views/evidence');
const projectEvidenceDir = path.resolve(__dirname, '../../../pm/missions/383-admin-analytics-project-views/evidence');

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
  await page.route('**/api/admin/analytics/blog-posts**', async (route) => {
    const postId = new URL(route.request().url()).searchParams.get('postId');
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        range: { from: '2026-07-04', to: '2026-08-02', interval: 'day', timezone: 'Asia/Seoul' },
        totalViews: postId ? 782 : 1_146,
        series: series.map((point) => ({ ...point, views: Math.round(point.views * 0.53) })),
        posts: [
          { id: 91, slug: 'lion-operation', title: '운영진이 기록한 한 학기', status: 'PUBLISHED', publishedAt: '2026-07-28T10:00:00', views: 782 },
          { id: 92, slug: 'last-recruit', title: '지난 모집 돌아보기', status: 'HIDDEN', publishedAt: '2026-07-15T10:00:00', views: 364 },
        ],
      }),
    });
  });
  await page.route('**/api/admin/analytics/projects**', async (route) => {
    const projectId = new URL(route.request().url()).searchParams.get('projectId');
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        range: { from: '2026-07-04', to: '2026-08-02', interval: 'day', timezone: 'Asia/Seoul' },
        totalViews: projectId ? 924 : 1_298,
        series: series.map((point) => ({ ...point, views: Math.round(point.views * 0.63) })),
        projects: [
          { id: 31, title: '모두의 캠퍼스', cohort: 14, hidden: false, createdAt: '2026-07-29T10:00:00', views: 924 },
          { id: 19, title: '작년의 식권 지도', cohort: 13, hidden: true, createdAt: '2026-02-10T10:00:00', views: 374 },
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

test('블로그 글별 조회와 선택 글 추이를 데스크톱·모바일에서 확인한다', async ({ page }) => {
  await page.goto('/admin/analytics?from=2026-07-04&to=2026-08-02&interval=day');
  await expect(page.getByRole('heading', { name: '블로그 글별 조회수' })).toBeVisible();
  await expect(page.getByText('숨김')).toBeVisible();
  await expect(page.getByText('782회')).toBeVisible();

  await page.getByRole('button', { name: /^운영진이 기록한 한 학기/ }).click();
  await expect(page).toHaveURL(/blog=91/);
  await expect(page.getByRole('heading', { name: '운영진이 기록한 한 학기 조회 추이' })).toBeVisible();
  await expect(page.getByRole('img', { name: /운영진이 기록한 한 학기 조회수 기간별 선 그래프/ })).toBeVisible();
  await page.locator('nextjs-portal').evaluateAll((elements) => elements.forEach((element) => element.remove()));
  const blogPanel = page.getByRole('region', { name: '블로그 글별 조회수' });
  await blogPanel.screenshot({ path: path.join(blogEvidenceDir, 'desktop-blog-selected.png') });

  await page.setViewportSize({ width: 390, height: 844 });
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(1);
  await blogPanel.screenshot({ path: path.join(blogEvidenceDir, 'mobile-blog-selected.png') });
});

test('프로젝트별 조회와 선택 프로젝트 추이를 데스크톱·모바일에서 확인한다', async ({ page }) => {
  await page.goto('/admin/analytics?from=2026-07-04&to=2026-08-02&interval=day');
  await expect(page.getByRole('heading', { name: '프로젝트별 조회수' })).toBeVisible();
  await expect(page.getByRole('button', { name: /^모두의 캠퍼스/ })).toBeVisible();
  await expect(page.getByText('924회')).toBeVisible();

  await page.getByRole('button', { name: /^모두의 캠퍼스/ }).click();
  await expect(page).toHaveURL(/project=31/);
  await expect(page.getByRole('heading', { name: '모두의 캠퍼스 조회 추이' })).toBeVisible();
  await expect(page.getByRole('img', { name: /모두의 캠퍼스 조회수 기간별 선 그래프/ })).toBeVisible();
  await page.locator('nextjs-portal').evaluateAll((elements) => elements.forEach((element) => element.remove()));
  const projectPanel = page.getByRole('region', { name: '프로젝트별 조회수' });
  await projectPanel.screenshot({ path: path.join(projectEvidenceDir, 'desktop-project-selected.png') });

  await page.setViewportSize({ width: 390, height: 844 });
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(1);
  await projectPanel.screenshot({ path: path.join(projectEvidenceDir, 'mobile-project-selected.png') });
});
