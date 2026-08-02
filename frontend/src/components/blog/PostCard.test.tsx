import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import type { PostSummary } from '@shared/types/feed';
import PostCard from './PostCard';

const post: PostSummary = {
  id: 1,
  slug: 'learning-log',
  title: '실패에서 배운 LLM 파이프라인 설계',
  summary: '프로젝트의 시행착오와 해결 과정을 기록했습니다.',
  thumbnailUrl: 'https://example.com/post.png',
  authorName: '김우진',
  authorPart: ['BACKEND'],
  authorEmoji: '🦁',
  authorPhotoUrl: null,
  status: 'PUBLISHED',
  publishedAt: '2026-08-01T09:00:00+09:00',
  createdAt: '2026-08-01T09:00:00+09:00',
};

describe('PostCard', () => {
  it('글 하나가 한 행을 차지하고 행 전체를 상세 링크로 제공한다', () => {
    render(<PostCard post={post} priority />);

    const link = screen.getByRole('link', { name: `${post.title} 글 읽기` });
    expect(link).toHaveAttribute('href', '/blog/learning-log');
    expect(link).toHaveClass('grid', 'border-t');
    expect(screen.getByRole('heading', { name: post.title })).toBeInTheDocument();
    expect(screen.getByText(post.summary!)).toBeInTheDocument();
    expect(screen.getByRole('img', { name: `${post.title} 대표 이미지` })).toHaveAttribute(
      'loading',
      'eager',
    );
    expect(screen.queryByText('Latest story')).not.toBeInTheDocument();
  });

  it('썸네일이 없거나 실패하면 같은 비율의 블로그 폴백을 보여준다', () => {
    const { rerender } = render(<PostCard post={post} />);

    fireEvent.error(screen.getByRole('img', { name: `${post.title} 대표 이미지` }));
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.getByText('BLOG')).toBeInTheDocument();

    rerender(<PostCard post={{ ...post, id: 2, slug: 'no-image', thumbnailUrl: null }} />);
    expect(screen.getByText('BLOG')).toBeInTheDocument();
  });
});
