import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AnalyticsDashboard, { friendlyPageName, parseAnalyticsQuery } from './AnalyticsDashboard';
import { getAnalyticsPageViews, getBlogAnalytics, getProjectAnalytics, getRecruitmentAnalytics } from '@/lib/adminApi';

const replace = vi.fn();
let params = new URLSearchParams('from=2026-07-04&to=2026-08-02&interval=day');

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace }),
  usePathname: () => '/admin/analytics',
  useSearchParams: () => params,
}));
vi.mock('@/lib/adminApi', () => ({
  getAnalyticsPageViews: vi.fn(),
  getBlogAnalytics: vi.fn(),
  getProjectAnalytics: vi.fn(),
  getRecruitmentAnalytics: vi.fn(),
}));
vi.mock('./AnalyticsTimeSeriesChart', () => ({
  default: ({ label }: { label: string }) => <div data-testid="chart">{label}</div>,
}));

const response = {
  range: { from: '2026-07-04', to: '2026-08-02', interval: 'day' as const, timezone: 'Asia/Seoul' as const },
  totalViews: 8,
  series: [
    { date: '2026-08-01', views: 3 },
    { date: '2026-08-02', views: 5 },
  ],
  pages: [
    { path: '/projects', views: 5 },
    { path: '/blog/hello', views: 3 },
  ],
};

const blogResponse = {
  range: response.range,
  totalViews: 0,
  series: response.series,
  posts: [
    { id: 11, slug: 'operation-review', title: '운영 회고', status: 'PUBLISHED' as const, publishedAt: '2026-07-30T10:00:00', views: 7 },
    { id: 12, slug: 'old-story', title: '지난 이야기', status: 'HIDDEN' as const, publishedAt: '2026-07-20T10:00:00', views: 3 },
  ],
};

const projectResponse = {
  range: response.range,
  totalViews: 0,
  series: response.series,
  projects: [
    { id: 31, title: '모두의 프로젝트', cohort: 14, hidden: false, createdAt: '2026-07-29T10:00:00', views: 8 },
    { id: 32, title: '지난 기수 프로젝트', cohort: 13, hidden: true, createdAt: '2026-07-20T10:00:00', views: 2 },
  ],
};

const recruitmentResponse = {
  roundId: 7,
  state: 'CLOSED' as const,
  openedAt: '2026-07-01T09:00:00',
  closedAt: '2026-07-14T18:00:00',
  applicationCount: 42,
};

describe('AnalyticsDashboard', () => {
  beforeEach(() => {
    params = new URLSearchParams('from=2026-07-04&to=2026-08-02&interval=day');
    replace.mockReset();
    vi.mocked(getAnalyticsPageViews).mockReset();
    vi.mocked(getBlogAnalytics).mockReset();
    vi.mocked(getProjectAnalytics).mockReset();
    vi.mocked(getRecruitmentAnalytics).mockReset();
    vi.mocked(getAnalyticsPageViews).mockResolvedValue(response);
    vi.mocked(getBlogAnalytics).mockResolvedValue(blogResponse);
    vi.mocked(getProjectAnalytics).mockResolvedValue(projectResponse);
    vi.mocked(getRecruitmentAnalytics).mockResolvedValue(recruitmentResponse);
  });

  it('비개발자가 뜻을 알 수 있는 설명·합계·페이지 표를 보여준다', async () => {
    render(<AnalyticsDashboard />);

    expect(screen.getByRole('heading', { name: '사이트 이용 현황' })).toBeInTheDocument();
    expect(screen.getByText(/같은 사람이 여러 번 연 경우도 모두 포함/)).toBeInTheDocument();
    expect(await screen.findByText('8')).toBeInTheDocument();
    expect(screen.getByText('프로젝트 목록')).toBeInTheDocument();
    expect(screen.getByText('블로그 글')).toBeInTheDocument();
    expect(screen.getByTestId('chart')).toHaveTextContent('전체 페이지 조회수');
    expect(await screen.findByText('운영 회고')).toBeInTheDocument();
    expect(await screen.findByText('모두의 프로젝트')).toBeInTheDocument();
    expect(screen.getAllByText('숨김')).toHaveLength(2);
    expect(await screen.findByLabelText('접수된 지원서 42건')).toBeInTheDocument();
    expect(screen.getByText('최근 종료 모집')).toBeInTheDocument();
    expect(screen.getByText(/아래 조회 기간을 바꿔도/)).toBeInTheDocument();
  });

  it('프로젝트를 선택하면 불변 프로젝트 ID를 URL에 남긴다', async () => {
    const user = userEvent.setup();
    render(<AnalyticsDashboard />);

    await user.click(await screen.findByRole('button', { name: /^모두의 프로젝트/ }));

    expect(replace).toHaveBeenCalledWith(
      '/admin/analytics?from=2026-07-04&to=2026-08-02&interval=day&project=31',
      { scroll: false }
    );
  });

  it('블로그 글을 선택하면 불변 글 ID를 URL에 남긴다', async () => {
    const user = userEvent.setup();
    render(<AnalyticsDashboard />);

    await user.click(await screen.findByRole('button', { name: /^운영 회고/ }));

    expect(replace).toHaveBeenCalledWith(
      '/admin/analytics?from=2026-07-04&to=2026-08-02&interval=day&blog=11',
      { scroll: false }
    );
  });

  it('페이지를 선택하면 기간·간격과 함께 URL에 남긴다', async () => {
    const user = userEvent.setup();
    render(<AnalyticsDashboard />);

    await screen.findByText('프로젝트 목록');
    await user.click(screen.getByRole('button', { name: /^프로젝트 목록/ }));

    expect(replace).toHaveBeenCalledWith(
      '/admin/analytics?from=2026-07-04&to=2026-08-02&interval=day&page=%2Fprojects',
      { scroll: false }
    );
  });

  it('잘못된 직접 기간은 API를 다시 부르기 전에 쉬운 문장으로 막는다', async () => {
    const user = userEvent.setup();
    render(<AnalyticsDashboard />);
    await screen.findByText('8');

    const inputs = screen.getAllByDisplayValue(/2026-/);
    await user.clear(inputs[0]);
    await user.type(inputs[0], '2026-08-03');
    await user.clear(inputs[1]);
    await user.type(inputs[1], '2026-08-02');
    await user.click(screen.getByRole('button', { name: '기간 적용' }));

    expect(screen.getByRole('alert')).toHaveTextContent('시작일은 종료일보다 늦을 수 없어요.');
    expect(replace).not.toHaveBeenCalled();
  });

  it('일부 API 장애가 어드민 전체를 막지 않고 재시도 버튼을 보여준다', async () => {
    vi.mocked(getAnalyticsPageViews).mockRejectedValue(new Error('서버 연결을 확인해주세요.'));
    render(<AnalyticsDashboard />);

    expect(await screen.findByRole('alert')).toHaveTextContent('서버 연결을 확인해주세요.');
    expect(screen.getByRole('button', { name: '다시 불러오기' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '사이트 이용 현황' })).toBeInTheDocument();
  });
});

describe('analytics query helpers', () => {
  it('URL 조건을 복원하고 잘못된 기간은 최근 30일로 되돌린다', () => {
    expect(parseAnalyticsQuery(new URLSearchParams('from=2026-08-03&to=2026-08-02&interval=week&page=%2Fblog'), '2026-08-02')).toEqual({
      from: '2026-07-04',
      to: '2026-08-02',
      interval: 'week',
      page: '/blog',
    });
  });

  it('동적 경로도 관리자가 읽는 이름으로 묶어 설명한다', () => {
    expect(friendlyPageName('/projects/12')).toBe('프로젝트 상세');
    expect(friendlyPageName('/blog/hello')).toBe('블로그 글');
  });
});
