import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Member } from '@shared/types/member';
import MemberMention from './MemberMention';

const president: Member = {
  id: 42,
  name: '홍길동',
  roles: ['PRESIDENT'],
  cohort: 14,
  emoji: '🦁',
  photoUrl: null,
  joinReason: null,
};

const openMember = vi.fn();
const ensureDirectory = vi.fn();

// provider 훅을 대체해 id 42만 해석되게 한다(공개 명단 로드 없이 렌더 검증).
vi.mock('@/components/members/MemberModalProvider', () => ({
  useMemberModal: () => ({
    resolveMember: (id: number) => (id === 42 ? president : undefined),
    ensureDirectory,
    openMember,
  }),
}));

describe('MemberMention', () => {
  it('해석되는 멤버는 칩으로 렌더하고 직책·운영진 표시를 담는다', () => {
    render(<MemberMention memberId={42} fallback="@홍길동" />);

    const chip = screen.getByRole('button', { name: '홍길동님 (운영진) 소개 보기' });
    expect(chip).toBeInTheDocument();
    expect(chip).toHaveTextContent('홍길동');
    // 호버카드의 직책·운영진(가려져 있어도 DOM엔 있음)
    expect(screen.getByText('회장')).toBeInTheDocument();
    expect(screen.getByText('운영진')).toBeInTheDocument();
  });

  it('칩을 누르면 그 멤버로 모달을 연다', async () => {
    const user = userEvent.setup();
    render(<MemberMention memberId={42} fallback="@홍길동" />);

    await user.click(screen.getByRole('button', { name: '홍길동님 (운영진) 소개 보기' }));
    expect(openMember).toHaveBeenCalledWith(president, expect.objectContaining({ originRect: expect.anything() }));
  });

  it('해석되지 않는 id는 평문으로 degrade한다(칩 없음)', () => {
    render(<MemberMention memberId={99} fallback="@없는사람" />);

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.getByText('@없는사람')).toBeInTheDocument();
  });
});
