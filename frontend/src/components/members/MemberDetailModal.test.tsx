import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Member } from '@shared/types/member';
import type { MemberActivity } from '@/lib/memberActivity';
import MemberDetailModal from './MemberDetailModal';

// jsdom엔 matchMedia가 없다 — 모달의 reduced-motion 구독이 쓰므로 기본값(감소 안 함)으로 mock.
beforeEach(() => {
  vi.stubGlobal(
    'matchMedia',
    vi.fn().mockReturnValue({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }),
  );
});

const member: Member = {
  id: 7,
  name: '김멋사',
  roles: ['FRONTEND', 'DESIGN'],
  cohort: 14,
  emoji: '🦁',
  photoUrl: null,
  joinReason: '서비스를 직접 만들어보고 싶었어요.',
};

const activities: MemberActivity[] = [
  {
    id: 'blog-1',
    kind: 'BLOG',
    title: '최근 블로그 글',
    summary: '블로그 요약',
    imageUrl: null,
    href: '/blog/recent-post',
    occurredAt: '2026-08-03T10:00:00+09:00',
  },
  {
    id: 'project-2',
    kind: 'PROJECT',
    title: '참여 프로젝트',
    summary: '프로젝트 요약',
    imageUrl: null,
    href: '/projects/2',
    occurredAt: '2026-07-01',
  },
];

describe('MemberDetailModal', () => {
  it('member가 없으면 아무것도 렌더링하지 않는다', () => {
    render(<MemberDetailModal member={null} activities={[]} onClose={vi.fn()} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('선택한 멤버의 공개 정보를 다이얼로그로 보여준다', () => {
    render(<MemberDetailModal member={member} activities={[]} onClose={vi.fn()} />);

    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(screen.getByRole('heading', { name: '김멋사' })).toBeInTheDocument();
    expect(screen.getByText('프론트엔드 · 디자인')).toBeInTheDocument();
    expect(screen.getByText('멋쟁이사자처럼 14기')).toBeInTheDocument();
    expect(screen.getByText(member.joinReason!)).toBeInTheDocument();
  });

  it('선택한 카드 색을 확장한 반응형 패널 안에 밝은 활동 카드와 이동 버튼을 둔다', () => {
    render(
      <MemberDetailModal
        member={member}
        accent={['#4b268d', '#ffffff']}
        activities={activities}
        onClose={vi.fn()}
      />,
    );

    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveStyle({ backgroundColor: '#4b268d', color: '#ffffff' });
    expect(dialog).toHaveClass('rounded-t-[36px]', 'sm:max-w-[1180px]', 'sm:rounded-[56px]');

    const activityCard = screen.getByRole('region', { name: '활동' });
    expect(activityCard).toHaveClass('bg-[#eeeeea]');
    expect(within(activityCard).getByRole('button', { name: '이전 활동' })).toBeInTheDocument();
    expect(within(activityCard).getByRole('button', { name: '다음 활동' })).toBeInTheDocument();
  });

  it('공개 활동이 없으면 빈 상태를 보여준다', () => {
    render(<MemberDetailModal member={member} activities={[]} onClose={vi.fn()} />);
    expect(screen.getByText('아직 공개된 활동이 없어요.')).toBeInTheDocument();
  });

  it('활동을 불러오지 못하면 빈 상태와 다른 안내를 보여준다', () => {
    render(
      <MemberDetailModal
        member={member}
        activities={[]}
        activitiesIncomplete
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByText(/활동 정보를 불러오지 못했어요/)).toBeInTheDocument();
  });

  it('블로그와 프로젝트를 이전·다음으로 순환하며 현재 위치를 알려준다', async () => {
    const user = userEvent.setup();
    render(<MemberDetailModal member={member} activities={activities} onClose={vi.fn()} />);

    expect(screen.getByText('최근 블로그 글')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '최근 블로그 글 자세히 보기' })).toHaveAttribute(
      'href',
      '/blog/recent-post',
    );
    expect(screen.getByText('01 / 02')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '다음 활동' }));
    expect(screen.getByText('참여 프로젝트')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '참여 프로젝트 자세히 보기' })).toHaveAttribute(
      'href',
      '/projects/2',
    );
    expect(screen.getByText('02 / 02')).toBeInTheDocument();

    // 끝에서 다음 → 처음으로 순환
    await user.click(screen.getByRole('button', { name: '다음 활동' }));
    expect(screen.getByText('최근 블로그 글')).toBeInTheDocument();
  });

  it('한 활동 소스가 실패해도 불러온 활동을 보여주며 일부 누락을 알린다', () => {
    render(
      <MemberDetailModal
        member={member}
        activities={[activities[0]]}
        activitiesIncomplete
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByText('최근 블로그 글')).toBeInTheDocument();
    expect(screen.getByText(/일부 활동을 불러오지 못했어요/)).toBeInTheDocument();
  });

  it('닫기 버튼을 누르면 onClose를 호출한다', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<MemberDetailModal member={member} activities={[]} onClose={onClose} />);

    await user.click(screen.getByRole('button', { name: '닫기' }));
    expect(onClose).toHaveBeenCalled();
  });
});
