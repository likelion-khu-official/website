import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AdminDashboard from './AdminDashboard';
import {
  getRecruitmentStatus,
  logout,
  refreshSession,
} from '@/lib/adminApi';

const replace = vi.fn();
const push = vi.fn();
const refresh = vi.fn();
const router = { replace, push, refresh };

vi.mock('next/navigation', () => ({
  useRouter: () => router,
}));

vi.mock('@/lib/adminApi', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/lib/adminApi')>();
  return {
    ...original,
    refreshSession: vi.fn(),
    logout: vi.fn(),
    getRecruitmentStatus: vi.fn(),
  };
});

const mockedRefreshSession = vi.mocked(refreshSession);
const mockedLogout = vi.mocked(logout);
const mockedGetRecruitmentStatus = vi.mocked(getRecruitmentStatus);

describe('AdminDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedRefreshSession.mockResolvedValue({
      admin: {
        id: 1,
        name: '김운영',
        email: 'admin@khu.ac.kr',
      },
    });
    mockedGetRecruitmentStatus.mockResolvedValue({
      open: false,
      subscriberCount: 12,
    });
    mockedLogout.mockResolvedValue(undefined);
  });

  it('PII 명단 대신 모집 요약과 목적별 이동 링크를 보여준다', async () => {
    render(<AdminDashboard />);

    expect(await screen.findByText('평소')).toBeInTheDocument();
    expect(screen.getByText('12명')).toBeInTheDocument();

    const expectedLinks = [
      ['멤버 관리', '/admin/members'],
      ['관리자 계정', '/admin/admins'],
      ['모집 관리', '/admin/recruitment'],
      ['지원자 확인', '/admin/applications'],
      ['지원서 양식', '/admin/application-form'],
      ['블로그 관리', '/admin/blog'],
    ];

    expectedLinks.forEach(([name, href]) => {
      expect(
        screen.getByRole('link', { name: new RegExp(`^${name}(?! 열기)`) })
      ).toHaveAttribute('href', href);
    });

    expect(mockedRefreshSession).toHaveBeenCalledTimes(1);
    expect(mockedGetRecruitmentStatus).toHaveBeenCalledTimes(1);
  });

  it('모집 상태 조회가 실패해도 빠른 작업과 로그아웃을 사용할 수 있다', async () => {
    mockedGetRecruitmentStatus.mockRejectedValueOnce(
      new Error('temporary failure')
    );
    const user = userEvent.setup();

    render(<AdminDashboard />);

    expect(
      await screen.findByText('지금은 상태를 확인할 수 없어요.')
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /멤버 관리/ })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /모집 관리 열기/ })
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '로그아웃' }));

    await waitFor(() => {
      expect(mockedLogout).toHaveBeenCalledTimes(1);
      expect(push).toHaveBeenCalledWith('/admin/login');
    });
  });

  it('모집 상태 오류에서 해당 카드만 다시 불러온다', async () => {
    mockedGetRecruitmentStatus
      .mockRejectedValueOnce(new Error('temporary failure'))
      .mockResolvedValueOnce({ open: true, subscriberCount: 3 });
    const user = userEvent.setup();

    render(<AdminDashboard />);

    await user.click(
      await screen.findByRole('button', { name: '상태 다시 불러오기' })
    );

    expect(await screen.findByText('모집중')).toBeInTheDocument();
    expect(screen.getByText('3명')).toBeInTheDocument();
    expect(mockedRefreshSession).toHaveBeenCalledTimes(1);
    expect(mockedGetRecruitmentStatus).toHaveBeenCalledTimes(2);
  });

  it('세션이 만료됐으면 로그인 화면으로 이동한다', async () => {
    const { AdminApiError } = await import('@/lib/adminApi');
    mockedRefreshSession.mockRejectedValueOnce(
      new AdminApiError('로그인이 필요해요.', 401, 'UNAUTHENTICATED')
    );

    render(<AdminDashboard />);

    await waitFor(() => {
      expect(replace).toHaveBeenCalledWith('/admin/login');
    });
    expect(mockedGetRecruitmentStatus).not.toHaveBeenCalled();
  });
});
