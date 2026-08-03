import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Member } from '@shared/types/member';
import type { ProjectSummary } from '@shared/types/project';
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

const projects: ProjectSummary[] = [
  { id: 1, title: '첫 번째 프로젝트', summary: '요약 1', representativeImageUrl: null, cohort: 14, techStack: [] },
  { id: 2, title: '두 번째 프로젝트', summary: '요약 2', representativeImageUrl: null, cohort: 13, techStack: [] },
];

describe('MemberDetailModal', () => {
  it('member가 없으면 아무것도 렌더링하지 않는다', () => {
    render(<MemberDetailModal member={null} projects={[]} onClose={vi.fn()} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('선택한 멤버의 공개 정보를 다이얼로그로 보여준다', () => {
    render(<MemberDetailModal member={member} projects={[]} onClose={vi.fn()} />);

    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(screen.getByRole('heading', { name: '김멋사' })).toBeInTheDocument();
    expect(screen.getByText('프론트엔드 · 디자인')).toBeInTheDocument();
    expect(screen.getByText('14기')).toBeInTheDocument();
    expect(screen.getByText(member.joinReason!)).toBeInTheDocument();
  });

  it('참여 프로젝트가 없으면 빈 상태를 보여준다', () => {
    render(<MemberDetailModal member={member} projects={[]} onClose={vi.fn()} />);
    expect(screen.getByText('아직 등록된 프로젝트가 없어요.')).toBeInTheDocument();
  });

  it('프로젝트를 불러오지 못하면 빈 상태와 다른 안내를 보여준다', () => {
    render(<MemberDetailModal member={member} projects={[]} projectsUnavailable onClose={vi.fn()} />);
    expect(screen.getByText(/프로젝트 정보를 불러오지 못했어요/)).toBeInTheDocument();
  });

  it('여러 프로젝트를 이전·다음으로 순환하며 현재 위치를 알려준다', async () => {
    const user = userEvent.setup();
    render(<MemberDetailModal member={member} projects={projects} onClose={vi.fn()} />);

    expect(screen.getByText('첫 번째 프로젝트')).toBeInTheDocument();
    expect(screen.getByText('1 / 2')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '다음 프로젝트' }));
    expect(screen.getByText('두 번째 프로젝트')).toBeInTheDocument();
    expect(screen.getByText('2 / 2')).toBeInTheDocument();

    // 끝에서 다음 → 처음으로 순환
    await user.click(screen.getByRole('button', { name: '다음 프로젝트' }));
    expect(screen.getByText('첫 번째 프로젝트')).toBeInTheDocument();
  });

  it('닫기 버튼을 누르면 onClose를 호출한다', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<MemberDetailModal member={member} projects={[]} onClose={onClose} />);

    await user.click(screen.getByRole('button', { name: '닫기' }));
    expect(onClose).toHaveBeenCalled();
  });
});
