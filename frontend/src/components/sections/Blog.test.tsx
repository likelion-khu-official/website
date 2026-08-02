import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { PostSummary, SpringPage } from '@shared/types/feed';
import Blog from './Blog';

const { getPostsMock } = vi.hoisted(() => ({ getPostsMock: vi.fn() }));

vi.mock('@/lib/feedApi', () => ({ getPosts: getPostsMock }));
vi.mock('@/lib/serverBaseUrl', () => ({ getBaseUrl: vi.fn().mockResolvedValue('') }));
vi.mock('@/components/blog/PostAuthor', () => ({ default: () => <div>작성자</div> }));
vi.mock('@/components/blog/StoryThumbnail', () => ({ default: () => <div>썸네일</div> }));
function post(id: number): PostSummary {
  return {
    id,
    slug: `story-${id}`,
    title: `기록 ${id}`,
    summary: `기록 ${id}의 요약`,
    thumbnailUrl: `/story-${id}.png`,
    authorName: '아기사자',
    authorPart: ['FRONTEND'],
    authorEmoji: '🦁',
    authorPhotoUrl: null,
    status: 'PUBLISHED',
    publishedAt: '2026-08-01T00:00:00Z',
    createdAt: '2026-08-01T00:00:00Z',
  };
}

function page(content: PostSummary[]): SpringPage<PostSummary> {
  return {
    content,
    totalElements: content.length,
    totalPages: 1,
    number: 0,
    size: 20,
    first: true,
    last: true,
    empty: content.length === 0,
  };
}

describe('landing Blog', () => {
  it('가장 최근 글 세 개를 미리 보여주고 전체 기록 링크를 분리한다', async () => {
    getPostsMock.mockResolvedValue(page([post(1), post(2), post(3), post(4)]));
    render(await Blog());

    expect(screen.getAllByRole('link', { name: /글 읽기/ })).toHaveLength(3);
    expect(screen.getByRole('heading', { name: '기록 1' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '기록 2' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '기록 3' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: '기록 4' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: '블로그 전체 보기' })).toBeInTheDocument();
  });

  it('블로그 전체 링크는 카드가 아닌 헤더 내비게이션으로 제공한다', async () => {
    getPostsMock.mockResolvedValue(page([post(1)]));
    render(await Blog());

    expect(screen.getByRole('link', { name: '블로그 전체 보기' })).toHaveClass(
      'inline-flex',
      'rounded-full',
      'border',
    );
    expect(screen.queryByText('01')).not.toBeInTheDocument();
  });
});
