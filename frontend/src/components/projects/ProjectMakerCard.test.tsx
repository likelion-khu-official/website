import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import type { Member } from '@shared/types/member';
import type { ProjectParticipant } from '@shared/types/project';
import ProjectMakerCard from './ProjectMakerCard';

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

describe('ProjectMakerCard', () => {
  it('공개 멤버 사진과 프로젝트에서 맡은 역할을 보여준다', () => {
    render(<ProjectMakerCard participant={participant} member={member} />);

    expect(screen.getByRole('img', { name: '신선우 프로필' })).toBeInTheDocument();
    expect(screen.getByText('백엔드')).toBeInTheDocument();
  });

  it('사진이 없거나 로드되지 않으면 멤버 이모지를 보여준다', () => {
    render(<ProjectMakerCard participant={participant} member={member} />);

    fireEvent.error(screen.getByRole('img', { name: '신선우 프로필' }));
    expect(screen.getByRole('img', { name: '신선우 프로필 대체 이미지' })).toHaveTextContent(
      '🐻',
    );
  });
});
