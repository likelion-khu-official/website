import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AdminAccountManagement from './AdminAccountManagement';
import { AdminApiError } from '@/lib/adminApi';
import type { AdminInvitationSummary, AdminSummary } from '@shared/types/admin';

const {
  routerMock,
  replaceMock,
  refreshSessionMock,
  listAdminsMock,
  listInvitationsMock,
  createInvitationMock,
  cancelInvitationMock,
  deleteAdminMock,
} = vi.hoisted(() => ({
  routerMock: { replace: vi.fn() },
  replaceMock: vi.fn(),
  refreshSessionMock: vi.fn(),
  listAdminsMock: vi.fn(),
  listInvitationsMock: vi.fn(),
  createInvitationMock: vi.fn(),
  cancelInvitationMock: vi.fn(),
  deleteAdminMock: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => routerMock,
}));

vi.mock('@/lib/adminApi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/adminApi')>();
  return {
    ...actual,
    refreshSession: refreshSessionMock,
    listAdmins: listAdminsMock,
    listInvitations: listInvitationsMock,
    createInvitation: createInvitationMock,
    cancelInvitation: cancelInvitationMock,
    deleteAdmin: deleteAdminMock,
  };
});

const admins: AdminSummary[] = [
  {
    id: 1,
    name: '현재 관리자',
    email: 'current.admin@khu.ac.kr',
    status: 'ACTIVE',
  },
  {
    id: 2,
    name: '다음 관리자',
    email: 'next.admin@khu.ac.kr',
    status: 'LOCKED',
  },
];

const invitations: AdminInvitationSummary[] = [
  {
    id: 11,
    email: 'pending.admin@khu.ac.kr',
    status: 'PENDING',
    invitedBy: 'current.admin@khu.ac.kr',
    expiresAt: '2026-08-03T12:00:00',
  },
  {
    id: 12,
    email: 'accepted.admin@khu.ac.kr',
    status: 'ACCEPTED',
    invitedBy: 'current.admin@khu.ac.kr',
    expiresAt: '2026-08-02T12:00:00',
  },
];

beforeEach(() => {
  routerMock.replace = replaceMock;
  replaceMock.mockReset();
  refreshSessionMock.mockReset();
  listAdminsMock.mockReset();
  listInvitationsMock.mockReset();
  createInvitationMock.mockReset();
  cancelInvitationMock.mockReset();
  deleteAdminMock.mockReset();

  refreshSessionMock.mockResolvedValue({ admin: admins[0] });
  listAdminsMock.mockResolvedValue(admins);
  listInvitationsMock.mockResolvedValue(invitations);
  createInvitationMock.mockResolvedValue(invitations[0]);
  cancelInvitationMock.mockResolvedValue(undefined);
  deleteAdminMock.mockResolvedValue(undefined);
  vi.spyOn(window, 'confirm').mockReturnValue(true);
});

describe('AdminAccountManagement', () => {
  it('현재 계정과 상태를 구분하고 역할 변경 UI 없이 관리자·초대 목록을 보여준다', async () => {
    render(<AdminAccountManagement />);

    expect(await screen.findByRole('heading', { name: '관리자 계정' })).toBeInTheDocument();
    expect(await screen.findByText('current.admin@khu.ac.kr')).toBeInTheDocument();
    expect(screen.getByText('나')).toBeInTheDocument();
    expect(screen.getByText('잠김')).toBeInTheDocument();
    expect(await screen.findByText('pending.admin@khu.ac.kr')).toBeInTheDocument();
    expect(screen.getByText('대기 중')).toBeInTheDocument();
    expect(screen.getByText('수락됨')).toBeInTheDocument();

    // 단일 관리자 모델: 역할 구분이 없으므로 로그인한 관리자면 누구나 초대할 수 있다.
    expect(screen.getByRole('button', { name: '초대 보내기' })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: '계정 삭제' })).toHaveLength(1);
    expect(screen.getAllByRole('button', { name: '초대 취소' })).toHaveLength(1);
    expect(screen.queryByText('최고관리자')).not.toBeInTheDocument();
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  });

  it('초대 성공 결과를 다시 불러오지 않고 대기 목록에 즉시 반영한다', async () => {
    const user = userEvent.setup();
    const newInvitation: AdminInvitationSummary = {
      id: 13,
      email: 'new.admin@khu.ac.kr',
      status: 'PENDING',
      invitedBy: 'current.admin@khu.ac.kr',
      expiresAt: '2026-08-04T12:00:00',
    };
    createInvitationMock.mockResolvedValue(newInvitation);

    render(<AdminAccountManagement />);
    await screen.findByText('pending.admin@khu.ac.kr');

    await user.type(screen.getByLabelText('학교 이메일'), newInvitation.email);
    await user.click(screen.getByRole('button', { name: '초대 보내기' }));

    expect(await screen.findByText(`${newInvitation.email}로 초대를 보냈어요.`)).toBeInTheDocument();
    expect(screen.getByText(newInvitation.email)).toBeInTheDocument();
    expect(screen.getByLabelText('학교 이메일')).toHaveValue('');
    expect(createInvitationMock).toHaveBeenCalledWith({ email: newInvitation.email });
    expect(listInvitationsMock).toHaveBeenCalledTimes(1);
  });

  it('대기 초대를 취소하면 해당 행을 취소 상태로 갱신한다', async () => {
    const user = userEvent.setup();
    render(<AdminAccountManagement />);
    await screen.findByText('pending.admin@khu.ac.kr');
    await screen.findByRole('button', { name: '초대 취소' });

    await user.click(screen.getByRole('button', { name: '초대 취소' }));

    await waitFor(() => expect(cancelInvitationMock).toHaveBeenCalledWith(11));
    expect(screen.getByText('취소됨')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '초대 취소' })).not.toBeInTheDocument();
  });

  it('마지막 관리자 삭제 거부를 다음 행동이 포함된 안내로 보여준다', async () => {
    const user = userEvent.setup();
    deleteAdminMock.mockRejectedValue(
      new AdminApiError('마지막 관리자입니다.', 409, 'LAST_ADMIN')
    );

    render(<AdminAccountManagement />);
    await screen.findByText('next.admin@khu.ac.kr');
    await screen.findByRole('button', { name: '계정 삭제' });

    await user.click(screen.getByRole('button', { name: '계정 삭제' }));

    expect(
      await screen.findByText(
        '마지막 관리자는 삭제할 수 없어요. 새 관리자를 먼저 초대하고 로그인을 확인한 뒤 다시 시도해 주세요.'
      )
    ).toBeInTheDocument();
    expect(deleteAdminMock).toHaveBeenCalledWith(2);
  });

  it('관리자 목록 오류와 초대 목록 성공을 서로 격리한다', async () => {
    listAdminsMock.mockRejectedValue(
      new AdminApiError('관리자 목록을 불러오지 못했어요.', 500)
    );

    render(<AdminAccountManagement />);

    expect(await screen.findByText('관리자 목록을 불러오지 못했어요.')).toBeInTheDocument();
    expect(screen.getByText('pending.admin@khu.ac.kr')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '관리자 목록 다시 시도' })).toBeInTheDocument();
  });
});
