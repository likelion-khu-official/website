import path from 'node:path';
import { expect, test } from '@playwright/test';

const evidenceDir = path.resolve(__dirname, '../../../pm/missions/381-admin-analytics-pageviews/evidence');
const blogEvidenceDir = path.resolve(__dirname, '../../../pm/missions/382-admin-analytics-blog-views/evidence');
const projectEvidenceDir = path.resolve(__dirname, '../../../pm/missions/383-admin-analytics-project-views/evidence');
const recruitmentEvidenceDir = path.resolve(__dirname, '../../../pm/missions/384-admin-analytics-application-count/evidence');
const visitorEvidenceDir = path.resolve(__dirname, '../../../pm/missions/385-admin-analytics-unique-visitors/evidence');
const deviceEvidenceDir = path.resolve(__dirname, '../../../pm/missions/386-admin-analytics-device-ratio/evidence');
const sectionEvidenceDir = path.resolve(__dirname, '../../../pm/missions/387-admin-analytics-section-reach/evidence');

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
  await page.route('**/api/admin/analytics/recruitment', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        roundId: 14,
        state: 'CLOSED',
        openedAt: '2026-07-01T09:00:00',
        closedAt: '2026-07-14T18:00:00',
        applicationCount: 128,
      }),
    });
  });
  await page.route('**/api/admin/analytics/visitors**', async (route) => {
    const selectedPage = new URL(route.request().url()).searchParams.get('page');
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        range: { from: '2026-07-04', to: '2026-08-02', interval: 'day', timezone: 'Asia/Seoul' },
        uniqueVisitors: selectedPage ? 241 : 864,
        series: series.map((point) => ({
          date: point.date,
          visitors: Math.max(1, Math.round(point.views * (selectedPage ? 0.17 : 0.58))),
        })),
      }),
    });
  });
  await page.route('**/api/admin/analytics/devices**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        range: { from: '2026-07-04', to: '2026-08-02', interval: 'all', timezone: 'Asia/Seoul' },
        totalViews: 1_474,
        devices: [
          { device: 'MOBILE', views: 892, percentage: 60.5 },
          { device: 'DESKTOP', views: 521, percentage: 35.3 },
          { device: 'OTHER', views: 61, percentage: 4.2 },
        ],
      }),
    });
  });
  await page.route('**/api/admin/analytics/sections**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        range: { from: '2026-07-04', to: '2026-08-02', interval: 'all', timezone: 'Asia/Seoul' },
        sections: [
          { section: 'PROJECT', reaches: 932 },
          { section: 'STAFF', reaches: 751 },
          { section: 'BLOG', reaches: 486 },
          { section: 'RECRUIT', reaches: 214 },
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

test('조회 기간과 분리된 최근 모집 지원 수를 데스크톱·모바일에서 확인한다', async ({ page }) => {
  await page.goto('/admin/analytics?from=2026-07-27&to=2026-08-02&interval=day');
  await expect(page.getByRole('heading', { name: '지원 수' })).toBeVisible();
  await expect(page.getByText('최근 종료 모집')).toBeVisible();
  await expect(page.getByLabel('접수된 지원서 128건')).toBeVisible();
  await expect(page.getByText('2026년 7월에 시작한 모집')).toBeVisible();
  await expect(page.getByText(/아래 조회 기간을 바꿔도/)).toBeVisible();

  await page.locator('nextjs-portal').evaluateAll((elements) => elements.forEach((element) => element.remove()));
  const card = page.getByRole('region', { name: '지원 수' });
  await card.screenshot({ path: path.join(recruitmentEvidenceDir, 'desktop-closed-recruitment.png') });

  await page.setViewportSize({ width: 390, height: 844 });
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(1);
  await card.screenshot({ path: path.join(recruitmentEvidenceDir, 'mobile-closed-recruitment.png') });
});

test('조회수와 추정 순 방문자를 표준 hover 그래프로 비교한다', async ({ page }) => {
  await page.goto('/admin/analytics?from=2026-07-04&to=2026-08-02&interval=day');
  await expect(page.getByText('추정 순 방문자', { exact: true }).first()).toBeVisible();
  await expect(page.getByText('864')).toBeVisible();
  await expect(page.getByText(/같은 브라우저의 반복 조회를 선택 기간에 한 명/)).toBeVisible();

  const graphPanel = page.getByRole('region', { name: '전체 페이지 조회수 추이' });
  await graphPanel.scrollIntoViewIfNeeded();
  const chart = page.getByRole('img', { name: /전체 페이지 조회수와 추정 순 방문자 기간별 선 그래프/ });
  await expect(chart).toBeVisible();
  await page.locator('nextjs-portal').evaluateAll((elements) => elements.forEach((element) => element.remove()));
  const box = await chart.boundingBox();
  if (!box) throw new Error('순 방문자 비교 그래프 위치를 확인할 수 없어요.');
  await page.mouse.move(box.x + box.width * 0.82, box.y + box.height * 0.42);
  await page.waitForTimeout(150);
  const panelBox = await graphPanel.boundingBox();
  if (!panelBox) throw new Error('순 방문자 비교 패널 위치를 확인할 수 없어요.');
  await page.screenshot({ path: path.join(visitorEvidenceDir, 'desktop-visitors-hover.png'), clip: panelBox });

  await page.setViewportSize({ width: 390, height: 844 });
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(1);
  await graphPanel.screenshot({ path: path.join(visitorEvidenceDir, 'mobile-visitors-chart.png') });
});

test('모바일·데스크톱·기타 비율을 도넛과 정확한 수치로 확인한다', async ({ page }) => {
  await page.goto('/admin/analytics?from=2026-07-04&to=2026-08-02&interval=day');
  const panel = page.getByRole('region', { name: '기기 비율' });
  await panel.scrollIntoViewIfNeeded();
  await expect(page.getByText('60.5%')).toBeVisible();
  await expect(page.getByText('35.3%')).toBeVisible();
  await expect(page.getByText('4.2%')).toBeVisible();
  await expect(page.getByText(/알 수 없는 기기도 버리지 않고/)).toBeVisible();

  const chart = page.getByRole('img', { name: /기기별 페이지 조회 비율 도넛 그래프/ });
  await expect(chart).toBeVisible();
  await page.locator('nextjs-portal').evaluateAll((elements) => elements.forEach((element) => element.remove()));
  const chartBox = await chart.boundingBox();
  if (!chartBox) throw new Error('기기 비율 도넛 위치를 확인할 수 없어요.');
  await page.mouse.move(chartBox.x + chartBox.width * 0.52, chartBox.y + chartBox.height * 0.12);
  await page.waitForTimeout(150);
  const panelBox = await panel.boundingBox();
  if (!panelBox) throw new Error('기기 비율 패널 위치를 확인할 수 없어요.');
  await page.screenshot({ path: path.join(deviceEvidenceDir, 'desktop-device-hover.png'), clip: panelBox });

  await page.setViewportSize({ width: 390, height: 844 });
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(1);
  await panel.screenshot({ path: path.join(deviceEvidenceDir, 'mobile-device-ratio.png') });
});

test('랜딩 섹션별 실제 도달을 그래프와 정확한 수치로 확인한다', async ({ page }) => {
  await page.goto('/admin/analytics?from=2026-07-04&to=2026-08-02&interval=day');
  const panel = page.getByRole('region', { name: '랜딩 섹션 도달' });
  await panel.scrollIntoViewIfNeeded();
  await expect(page.getByText('932회')).toBeVisible();
  await expect(page.getByText('751회')).toBeVisible();
  await expect(page.getByText('486회')).toBeVisible();
  await expect(page.getByText('214회')).toBeVisible();
  await expect(page.getByText(/같은 방문에서 위아래로 다시 움직여도 중복해서 세지 않아요/)).toBeVisible();

  const chart = page.getByRole('img', { name: /랜딩 섹션별 도달 수 가로 막대그래프/ });
  await expect(chart).toBeVisible();
  await page.locator('nextjs-portal').evaluateAll((elements) => elements.forEach((element) => element.remove()));
  const chartBox = await chart.boundingBox();
  if (!chartBox) throw new Error('랜딩 섹션 도달 그래프 위치를 확인할 수 없어요.');
  await page.mouse.move(chartBox.x + chartBox.width * 0.72, chartBox.y + chartBox.height * 0.18);
  await page.waitForTimeout(150);
  const panelBox = await panel.boundingBox();
  if (!panelBox) throw new Error('랜딩 섹션 도달 패널 위치를 확인할 수 없어요.');
  await page.screenshot({ path: path.join(sectionEvidenceDir, 'desktop-section-hover.png'), clip: panelBox });

  await page.setViewportSize({ width: 390, height: 844 });
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(1);
  await panel.screenshot({ path: path.join(sectionEvidenceDir, 'mobile-section-reach.png') });
});
