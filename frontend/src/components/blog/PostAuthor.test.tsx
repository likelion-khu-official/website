import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { PostSummary } from '@shared/types/feed';
import PostAuthor from './PostAuthor';

const post: PostSummary = {
  id: 1,
  slug: 'together',
  title: '함께 쓴 글',
  summary: null,
  thumbnailUrl: null,
  authorName: '김우진',
  authorMemberId: 1,
  authorPart: ['BACKEND'],
  authorEmoji: '🦁',
  authorPhotoUrl: null,
  coauthors: [
    { memberId: 2, name: '박일하', parts: ['FRONTEND'], emoji: '🦊', photoUrl: null },
    { memberId: 3, name: '김현정', parts: ['FRONTEND'], emoji: '🐯', photoUrl: null },
    { memberId: 4, name: '신선우', parts: ['BACKEND'], emoji: '🐻', photoUrl: null },
  ],
  status: 'PUBLISHED',
  publishedAt: '2026-08-11T00:00:00Z',
  createdAt: '2026-08-11T00:00:00Z',
};

describe('PostAuthor', () => {
  it('주 작성자와 공동저자를 하나의 바이라인으로 표시한다', () => {
    render(<PostAuthor post={post} />);

    expect(screen.getByText('김우진 · 박일하 · 김현정 · 신선우')).toBeInTheDocument();
    expect(screen.getByText('+1')).toBeInTheDocument();
  });
});
