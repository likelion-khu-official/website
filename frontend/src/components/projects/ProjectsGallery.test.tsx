import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { ProjectSummary } from '@shared/types/project';
import ProjectsGallery from './ProjectsGallery';

function projects(count: number): ProjectSummary[] {
  return Array.from({ length: count }, (_, index) => ({
    id: index + 1,
    title: `프로젝트 ${index + 1}`,
    summary: `프로젝트 ${index + 1}의 한 줄 소개`,
    representativeImageUrl: `/project-${index + 1}.png`,
    cohort: 14,
    techStack: [],
  }));
}

describe('ProjectsGallery', () => {
  it.each([1, 2, 3, 6])('%i개 프로젝트를 모두 중복 없이 보여준다', (count) => {
    render(<ProjectsGallery projects={projects(count)} />);

    expect(screen.getAllByRole('link', { name: /프로젝트 자세히 보기/ })).toHaveLength(count);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('모든 프로젝트를 같은 포트폴리오 그리드 규칙으로 보여준다', () => {
    const { container } = render(<ProjectsGallery projects={projects(6)} />);

    expect(container.querySelector('.grid-cols-2')).toBeInTheDocument();
    expect(container.querySelector('.lg\\:grid-cols-3')).toBeInTheDocument();
    expect(screen.queryByText(/최근 프로젝트/)).not.toBeInTheDocument();
  });

  it('프로젝트가 없으면 빈 상태를 보여준다', () => {
    render(<ProjectsGallery projects={[]} />);

    expect(screen.getByText('아직 등록된 프로젝트가 없어요.')).toBeInTheDocument();
  });

  it('조회 실패 시 오류와 다시 불러오기 동작을 보여준다', () => {
    render(<ProjectsGallery projects={[]} failed />);

    expect(screen.getByRole('alert')).toHaveTextContent('프로젝트를 불러오지 못했어요.');
    expect(screen.getByRole('link', { name: '다시 불러오기' })).toHaveAttribute(
      'href',
      '/projects',
    );
  });
});
