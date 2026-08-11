import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import type { Member } from '@shared/types/member';
import type { ProjectParticipant } from '@shared/types/project';
import ProjectMakerCard from './ProjectMakerCard';
import MemberModalProvider from '@/components/members/MemberModalProvider';

// 상세 모달(provider가 렌더)이 reduced-motion 구독에 matchMedia를 쓴다 — 기본값으로 mock.
beforeEach(() => {
  vi.stubGlobal(
    'matchMedia',
    vi.fn().mockReturnValue({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }),
  );
});

const participant: ProjectParticipant = {
  memberId: 21,
  name: '신선우',
  part: 'BACKEND',
};

const member: Member = {
  id: 21,
  name: '신선우',
  roles: ['BACKEND'],
  cohort: 14,
  emoji: '🐻',
  photoUrl: 'https://example.com/profile.png',
  joinReason: null,
};

function renderCard(props: { participant: ProjectParticipant; member?: Member }) {
  return render(
    <MemberModalProvider>
      <ul>
        <ProjectMakerCard {...props} />
      </ul>
    </MemberModalProvider>,
  );
}

describe('ProjectMakerCard', () => {
  it('공개 멤버 사진과 프로젝트에서 맡은 역할을 보여준다', () => {
    renderCard({ participant, member });

    expect(screen.getByRole('img', { name: '신선우 프로필' })).toBeInTheDocument();
    expect(screen.getByText('백엔드')).toBeInTheDocument();
  });

  it('사진이 없거나 로드되지 않으면 멤버 이모지를 보여준다', () => {
    renderCard({ participant, member });

    fireEvent.error(screen.getByRole('img', { name: '신선우 프로필' }));
    expect(screen.getByRole('img', { name: '신선우 프로필 대체 이미지' })).toHaveTextContent('🐻');
  });

  it('공개 멤버면 눌러서 소개 모달을 연다', () => {
    renderCard({ participant, member });

    fireEvent.click(screen.getByRole('button', { name: '신선우님 소개 보기' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '신선우' })).toBeInTheDocument();
  });

  it('명단에 없는 참여자는 버튼이 아니라 정적으로 둔다', () => {
    renderCard({ participant });
    expect(screen.queryByRole('button', { name: '신선우님 소개 보기' })).not.toBeInTheDocument();
  });
});
