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
    expect(screen.getByText(`${count}개의 프로젝트`)).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('마지막 행은 남은 카드 수에 맞춰 빈 열 없이 폭을 채운다', () => {
    const { rerender } = render(<ProjectsGallery projects={projects(2)} />);
    let links = screen.getAllByRole('link', { name: /프로젝트 자세히 보기/ });
    expect(links[1].parentElement).toHaveClass('sm:col-span-2', 'xl:max-w-[860px]');

    rerender(<ProjectsGallery projects={projects(6)} />);
    links = screen.getAllByRole('link', { name: /프로젝트 자세히 보기/ });
    expect(links[4].parentElement).toHaveClass('xl:col-span-3');
    expect(links[5].parentElement).toHaveClass('xl:col-span-3');
  });

  it('프로젝트가 없으면 빈 상태를 보여준다', () => {
    render(<ProjectsGallery projects={[]} />);

    expect(screen.getByText('첫 프로젝트를 준비하고 있어요.')).toBeInTheDocument();
    expect(screen.getByText('0개의 프로젝트')).toBeInTheDocument();
  });

  it('조회 실패 시 오류와 다시 불러오기 동작을 보여준다', () => {
    render(<ProjectsGallery projects={[]} failed />);

    expect(screen.getByRole('alert')).toHaveTextContent('프로젝트를 불러오지 못했어요.');
    expect(screen.getByRole('link', { name: '다시 불러오기' })).toHaveAttribute(
      'href',
      '/projects',
    );
    expect(screen.queryByText(/개의 프로젝트/)).not.toBeInTheDocument();
  });
});
