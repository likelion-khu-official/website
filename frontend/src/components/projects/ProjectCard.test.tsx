import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import type { ProjectSummary } from '@shared/types/project';
import ProjectCard from './ProjectCard';

const project: ProjectSummary = {
  id: 7,
  title: '아주 긴 프로젝트 이름도 생략하지 않고 보여주는 서비스',
  summary: '아이디어를 실제 서비스로 완성한 프로젝트입니다.',
  representativeImageUrl: 'https://example.com/project.png',
  cohort: 14,
  techStack: ['Next.js', 'Spring'],
};

describe('ProjectCard', () => {
  it('대표 이미지와 전체 제목, 상세 링크를 제공한다', () => {
    render(<ProjectCard project={project} />);

    expect(screen.getByRole('link', { name: `${project.title} 프로젝트 자세히 보기` })).toHaveAttribute(
      'href',
      '/projects/7',
    );
    expect(screen.getByRole('img', { name: `${project.title} 대표 이미지` })).toHaveClass(
      'object-contain',
    );
    expect(screen.getByRole('heading', { name: project.title })).toBeInTheDocument();
    expect(screen.getByLabelText('기술 스택')).toHaveTextContent('Next.js');
  });

  it('대표 이미지가 없거나 로드에 실패하면 같은 프레임 안에 기수 폴백을 보여준다', () => {
    const { rerender } = render(<ProjectCard project={project} />);

    fireEvent.error(screen.getByRole('img', { name: `${project.title} 대표 이미지` }));
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.getByText('14')).toBeInTheDocument();

    rerender(
      <ProjectCard project={{ ...project, id: 8, representativeImageUrl: null, cohort: 15 }} />,
    );
    expect(screen.getByText('15')).toBeInTheDocument();
  });

  it('lead card는 최근 프로젝트로 구분하고 빈 기술 스택 영역을 만들지 않는다', () => {
    render(<ProjectCard project={{ ...project, techStack: [] }} featured />);

    expect(screen.getByText('최근 프로젝트 · 14기')).toBeInTheDocument();
    expect(screen.queryByLabelText('기술 스택')).not.toBeInTheDocument();
  });
});
