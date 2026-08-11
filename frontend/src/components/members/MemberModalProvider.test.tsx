import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Member } from '@shared/types/member';
import MemberModalProvider, { useMemberModal } from './MemberModalProvider';

const { getMembersMock, loadActivitiesMock } = vi.hoisted(() => ({
  getMembersMock: vi.fn(),
  loadActivitiesMock: vi.fn(),
}));

vi.mock('@/lib/rosterApi', () => ({ getMembers: getMembersMock }));
vi.mock('@/lib/memberActivityLoader', () => ({ loadActivitiesByMember: loadActivitiesMock }));
vi.mock('./MemberDetailModal', () => ({
  default: ({ member, loading }: { member: Member | null; loading?: boolean }) => member ? (
    <div role="dialog" data-loading={String(loading)}>{loading ? '스켈레톤' : member.name}</div>
  ) : null,
}));

const member: Member = {
  id: 2,
  name: '박일하',
  roles: ['FRONTEND'],
  cohort: 14,
  emoji: '🦊',
  photoUrl: null,
  joinReason: null,
};

function Harness() {
  const { openMemberById } = useMemberModal();
  return (
    <button
      type="button"
      onClick={() => openMemberById(2, { fallbackName: '박일하' })}
    >
      박일하 열기
    </button>
  );
}

describe('MemberModalProvider', () => {
  beforeEach(() => {
    getMembersMock.mockReset();
    loadActivitiesMock.mockReset().mockResolvedValue({ activitiesByMember: {}, incomplete: false });
  });

  it('멤버 디렉터리 응답을 기다리지 않고 스켈레톤 모달부터 연다', async () => {
    let resolveMembers!: (members: Member[]) => void;
    getMembersMock.mockReturnValue(new Promise<Member[]>((resolve) => {
      resolveMembers = resolve;
    }));
    const user = userEvent.setup();
    render(
      <MemberModalProvider>
        <Harness />
      </MemberModalProvider>,
    );

    await user.click(screen.getByRole('button', { name: '박일하 열기' }));
    expect(screen.getByRole('dialog')).toHaveAttribute('data-loading', 'true');
    expect(screen.getByText('스켈레톤')).toBeInTheDocument();

    resolveMembers([member]);
    await waitFor(() => expect(screen.getByRole('dialog')).toHaveAttribute('data-loading', 'false'));
    expect(screen.getByText('박일하')).toBeInTheDocument();
  });
});
