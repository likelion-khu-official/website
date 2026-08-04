import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MemberShell, { isPublicMemberPath } from './MemberShell';
import { MemberApiError, getCurrentMember, logout } from '@/lib/memberApi';

let pathname = '/member';
const replace = vi.fn();
const push = vi.fn();
const refresh = vi.fn();

vi.mock('next/navigation', () => ({
  usePathname: () => pathname,
  useRouter: () => ({ replace, push, refresh }),
}));

vi.mock('@/lib/memberApi', async () => {
  const actual = await vi.importActual<typeof import('@/lib/memberApi')>('@/lib/memberApi');
  return {
    ...actual,
    getCurrentMember: vi.fn(),
    logout: vi.fn(),
  };
});

const mockedGetCurrentMember = vi.mocked(getCurrentMember);
const mockedLogout = vi.mocked(logout);

describe('MemberShell', () => {
  beforeEach(() => {
    pathname = '/member';
    replace.mockReset();
    push.mockReset();
    refresh.mockReset();
    mockedGetCurrentMember.mockReset();
    mockedLogout.mockReset();
    mockedGetCurrentMember.mockResolvedValue({
      member: {
        id: 1,
        studentId: '2022000000',
        name: '홍길동',
        mustChangePassword: false,
        role: 'MEMBER',
      },
    });
    mockedLogout.mockResolvedValue({ success: true });
  });

  it.each(['/member/login', '/member/forgot-password'])(
    '인증 전용 경로 %s에서는 업무 셸을 숨긴다',
    (publicPath) => {
      pathname = publicPath;

      render(
        <MemberShell>
          <p>인증 화면</p>
        </MemberShell>
      );

      expect(screen.getByText('인증 화면')).toBeInTheDocument();
      expect(screen.queryByRole('navigation', { name: '멤버 공간' })).not.toBeInTheDocument();
      expect(mockedGetCurrentMember).not.toHaveBeenCalled();
    }
  );

  it('보호된 화면에서 본인 이름과 모든 메뉴를 보여준다', async () => {
    pathname = '/member/posts';

    render(
      <MemberShell>
        <p>내 글 화면</p>
      </MemberShell>
    );

    expect(await screen.findByText('내 글 화면')).toBeInTheDocument();
    expect(screen.getByText('홍길동 님')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '홈' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '내 프로젝트' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '프로필' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '내 글' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: '홈' })).not.toHaveAttribute('aria-current');
  });

  it.each([
    ['/member/write', '내 글'],
    ['/member/projects/new', '내 프로젝트'],
    ['/member/profile', '프로필'],
  ])('%s 경로에서는 %s 메뉴가 현재 위치로 표시된다', async (path, label) => {
    pathname = path;

    render(
      <MemberShell>
        <p>본문</p>
      </MemberShell>
    );

    expect(await screen.findByRole('link', { name: label })).toHaveAttribute(
      'aria-current',
      'page'
    );
  });

  it('로그아웃 버튼을 누르면 로그아웃 API를 호출하고 로그인 화면으로 이동한다', async () => {
    const user = userEvent.setup();

    render(
      <MemberShell>
        <p>대시보드 본문</p>
      </MemberShell>
    );

    const logoutButton = await screen.findByRole('button', { name: '로그아웃' });
    await user.click(logoutButton);

    await waitFor(() => {
      expect(mockedLogout).toHaveBeenCalledOnce();
      expect(push).toHaveBeenCalledWith('/member/login');
      expect(refresh).toHaveBeenCalledOnce();
    });
  });

  it('로그아웃 API가 실패해도 로그인 화면으로 이동한다', async () => {
    const user = userEvent.setup();
    mockedLogout.mockRejectedValue(new MemberApiError('로그아웃에 실패했어요.', 500, null));

    render(
      <MemberShell>
        <p>대시보드 본문</p>
      </MemberShell>
    );

    const logoutButton = await screen.findByRole('button', { name: '로그아웃' });
    await user.click(logoutButton);

    await waitFor(() => {
      expect(push).toHaveBeenCalledWith('/member/login');
    });
  });

  it('세션이 만료되면(401) 원래 경로를 담아 로그인으로 보낸다', async () => {
    pathname = '/member/projects';
    mockedGetCurrentMember.mockRejectedValue(
      new MemberApiError('로그인이 필요해요.', 401, 'UNAUTHENTICATED')
    );

    render(
      <MemberShell>
        <p>보호된 본문</p>
      </MemberShell>
    );

    await waitFor(() => {
      expect(replace).toHaveBeenCalledWith('/member/login?returnTo=%2Fmember%2Fprojects');
    });
    expect(screen.queryByText('보호된 본문')).not.toBeInTheDocument();
  });

  it('비밀번호를 아직 안 바꾼 계정은 로그인 화면으로 되돌려보낸다', async () => {
    mockedGetCurrentMember.mockResolvedValue({
      member: {
        id: 1,
        studentId: '2022000000',
        name: '홍길동',
        mustChangePassword: true,
        role: 'MEMBER',
      },
    });

    render(
      <MemberShell>
        <p>보호된 본문</p>
      </MemberShell>
    );

    await waitFor(() => {
      expect(replace).toHaveBeenCalledWith('/member/login?returnTo=%2Fmember');
    });
    expect(screen.queryByText('보호된 본문')).not.toBeInTheDocument();
  });

  it('세션 확인 중 서버 오류가 나면 다시 시도 버튼을 보여준다', async () => {
    const user = userEvent.setup();
    mockedGetCurrentMember
      .mockRejectedValueOnce(new MemberApiError('로그인 상태를 확인하지 못했어요.', 500, null))
      .mockResolvedValueOnce({
        member: {
          id: 1,
          studentId: '2022000000',
          name: '홍길동',
          mustChangePassword: false,
          role: 'MEMBER',
        },
      });

    render(
      <MemberShell>
        <p>보호된 본문</p>
      </MemberShell>
    );

    const retryButton = await screen.findByRole('button', { name: '다시 시도' });
    await user.click(retryButton);

    expect(await screen.findByText('보호된 본문')).toBeInTheDocument();
  });
});

describe('isPublicMemberPath', () => {
  it('로그인·비밀번호 찾기만 공개 경로로 분류한다', () => {
    expect(isPublicMemberPath('/member/login')).toBe(true);
    expect(isPublicMemberPath('/member/forgot-password')).toBe(true);
    expect(isPublicMemberPath('/member')).toBe(false);
    expect(isPublicMemberPath('/member/posts')).toBe(false);
  });
});
