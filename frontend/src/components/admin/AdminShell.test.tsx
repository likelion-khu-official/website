import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AdminShell, { isPublicAdminPath } from './AdminShell';
import { AdminApiError, logout, refreshSession } from '@/lib/adminApi';

let pathname = '/admin';
const replace = vi.fn();
const push = vi.fn();
const refresh = vi.fn();

vi.mock('next/navigation', () => ({
  usePathname: () => pathname,
  useRouter: () => ({ replace, push, refresh }),
}));

vi.mock('@/lib/adminApi', async () => {
  const actual = await vi.importActual<typeof import('@/lib/adminApi')>('@/lib/adminApi');
  return {
    ...actual,
    refreshSession: vi.fn(),
    logout: vi.fn(),
  };
});

const mockedRefreshSession = vi.mocked(refreshSession);
const mockedLogout = vi.mocked(logout);

describe('AdminShell', () => {
  beforeEach(() => {
    pathname = '/admin';
    replace.mockReset();
    push.mockReset();
    refresh.mockReset();
    mockedRefreshSession.mockReset();
    mockedLogout.mockReset();
    mockedRefreshSession.mockResolvedValue({
      admin: {
        id: 1,
        name: '김운영',
        email: 'admin@khu.ac.kr',
      },
    });
    mockedLogout.mockResolvedValue(undefined);
  });

  it.each([
    '/admin/login',
    '/admin/forgot-password',
    '/admin/invite/token-value',
    '/admin/reset-password/token-value',
  ])('인증 전용 경로 %s에서는 업무 셸을 숨긴다', (publicPath) => {
    pathname = publicPath;

    render(
      <AdminShell>
        <p>인증 화면</p>
      </AdminShell>
    );

    expect(screen.getByText('인증 화면')).toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: '어드민 주요 메뉴' })).not.toBeInTheDocument();
    expect(mockedRefreshSession).not.toHaveBeenCalled();
  });

  it('보호된 화면에서 현재 관리자와 모든 업무 메뉴를 보여준다', async () => {
    pathname = '/admin/members';

    render(
      <AdminShell>
        <p>멤버 화면</p>
      </AdminShell>
    );

    expect(await screen.findByText('멤버 화면')).toBeInTheDocument();
    expect(screen.getAllByText('김운영')).toHaveLength(2);
    expect(screen.getAllByRole('link', { name: '멤버 관리' })).toHaveLength(2);
    expect(screen.getAllByRole('link', { name: '관리자 계정' })).toHaveLength(2);
    expect(screen.getAllByRole('link', { name: '이용 현황' })).toHaveLength(2);
    expect(screen.getAllByRole('link', { name: '멤버 관리' })[0]).toHaveAttribute(
      'aria-current',
      'page'
    );
    expect(screen.getAllByRole('link', { name: '대시보드' })[0]).not.toHaveAttribute(
      'aria-current'
    );
  });

  it('모바일 메뉴를 버튼으로 열고 닫을 수 있다', async () => {
    const user = userEvent.setup();

    render(
      <AdminShell>
        <p>대시보드 본문</p>
      </AdminShell>
    );

    const menuButton = await screen.findByRole('button', { name: '메뉴' });
    expect(menuButton).toHaveAttribute('aria-expanded', 'false');

    await user.click(menuButton);
    expect(screen.getByRole('button', { name: '메뉴 닫기' })).toHaveAttribute(
      'aria-expanded',
      'true'
    );
  });

  it('로그아웃 후 로그인 화면으로 이동한다', async () => {
    const user = userEvent.setup();

    render(
      <AdminShell>
        <p>대시보드 본문</p>
      </AdminShell>
    );

    const logoutButtons = await screen.findAllByRole('button', { name: '로그아웃' });
    await user.click(logoutButtons[0]);

    await waitFor(() => {
      expect(mockedLogout).toHaveBeenCalledOnce();
      expect(push).toHaveBeenCalledWith('/admin/login');
      expect(refresh).toHaveBeenCalledOnce();
    });
  });

  it('세션이 만료되면 로그인 화면으로 이동한다', async () => {
    mockedRefreshSession.mockRejectedValue(
      new AdminApiError('세션이 만료됐어요.', 401, 'INVALID_REFRESH_TOKEN')
    );

    render(
      <AdminShell>
        <p>보호된 본문</p>
      </AdminShell>
    );

    await waitFor(() => {
      expect(replace).toHaveBeenCalledWith('/admin/login');
    });
    expect(screen.queryByText('보호된 본문')).not.toBeInTheDocument();
  });
});

describe('isPublicAdminPath', () => {
  it('인증 전용 경로만 공개 경로로 분류한다', () => {
    expect(isPublicAdminPath('/admin/login')).toBe(true);
    expect(isPublicAdminPath('/admin/invite/abc')).toBe(true);
    expect(isPublicAdminPath('/admin/reset-password/abc')).toBe(true);
    expect(isPublicAdminPath('/admin')).toBe(false);
    expect(isPublicAdminPath('/admin/members')).toBe(false);
  });
});
