import { describe, expect, it, vi } from 'vitest';
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
  it('상세 모달을 여는 버튼으로 렌더링된다', () => {
    render(<MemberCard member={member} colorIndex={0} onSelect={vi.fn()} />);
    const button = screen.getByRole('button', { name: /홍길동님 소개와 참여 프로젝트 보기/ });
    expect(button).toHaveAttribute('aria-haspopup', 'dialog');
  });

  it('클릭하면 해당 멤버로 onSelect를 호출한다', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<MemberCard member={member} colorIndex={0} onSelect={onSelect} />);

    await user.click(screen.getByRole('button', { name: /홍길동님 소개와 참여 프로젝트 보기/ }));

    expect(onSelect).toHaveBeenCalledWith(member);
  });

  it('키보드(Enter)로도 선택할 수 있다', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<MemberCard member={member} colorIndex={0} onSelect={onSelect} />);

    await user.tab();
    await user.keyboard('{Enter}');

    expect(onSelect).toHaveBeenCalledWith(member);
  });
});
