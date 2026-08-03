import { render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PostDetail } from '@shared/types/feed';
import { getPostBySlug } from '@/lib/feedApi';
import PostPage from './page';

vi.mock('@/lib/feedApi', () => ({ getPostBySlug: vi.fn() }));
vi.mock('@/lib/serverBaseUrl', () => ({ getBaseUrl: vi.fn().mockResolvedValue('') }));
vi.mock('@/components/blog/CommentSection', () => ({ default: () => <div>댓글</div> }));
vi.mock('@/components/blog/MarkdownContent', () => ({
  default: () => <div>본문</div>,
  markdownIncludesImage: vi.fn().mockReturnValue(false),
}));
vi.mock('@/components/blog/PostAuthor', () => ({ default: () => <div>작성자</div> }));
vi.mock('@/components/blog/PostThumbnail', () => ({ default: () => <div>썸네일</div> }));

const post: PostDetail = {
  id: 1,
  slug: 'mobile-gutter',
  title: '모바일에서도 편안하게 읽는 글',
  summary: '글 상세 여백을 확인합니다.',
  thumbnailUrl: null,
  authorName: '김우진',
  authorPart: ['BACKEND'],
  authorEmoji: '🦁',
  authorPhotoUrl: null,
  status: 'PUBLISHED',
  publishedAt: '2026-08-01T00:00:00Z',
  createdAt: '2026-08-01T00:00:00Z',
  content: '본문',
  updatedAt: '2026-08-01T00:00:00Z',
  commentCount: 0,
};

describe('PostPage', () => {
  beforeEach(() => {
    vi.mocked(getPostBySlug).mockResolvedValue(post);
  });

  it('모바일 안전 여백을 두면서 데스크톱 본문 최대 너비를 유지한다', async () => {
    const { container } = render(
      await PostPage({ params: Promise.resolve({ slug: post.slug }) }),
    );
    const article = container.querySelector('article');

    expect(article).toHaveClass('w-full', 'max-w-[848px]', 'px-5', 'sm:px-10');
  });
});
