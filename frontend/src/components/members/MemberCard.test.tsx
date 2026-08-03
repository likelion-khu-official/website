import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Member } from '@shared/types/member';
import MemberCard from './MemberCard';

const member: Member = {
  id: 1,
  name: '홍길동',
  roles: ['FRONTEND'],
  cohort: 14,
  emoji: '🦁',
  photoUrl: null,
  joinReason: '함께 성장하고 싶어서 지원했어요.',
};

describe('MemberCard', () => {
  it('처음에는 닫힌 상태로 렌더링된다', () => {
    render(<MemberCard member={member} colorIndex={0} />);
    const button = screen.getByRole('button', { name: /홍길동님의 참여 이유 보기/ });
    expect(button).toHaveAttribute('aria-expanded', 'false');
  });

  it('클릭하면 참여 이유가 펼쳐진다', async () => {
    const user = userEvent.setup();
    render(<MemberCard member={member} colorIndex={0} />);
    const button = screen.getByRole('button', { name: /홍길동님의 참여 이유 보기/ });

    await user.click(button);

    expect(button).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText(member.joinReason!)).toBeInTheDocument();
  });
});
