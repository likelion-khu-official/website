import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { PostSummary } from '@shared/types/feed';
import PostAuthor from './PostAuthor';

const openMemberById = vi.fn();

vi.mock('@/components/members/MemberModalProvider', () => ({
  useMemberModal: () => ({ openMemberById }),
}));

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
    render(<PostAuthor post={post} compact />);

    const names = screen.getByText('김우진').closest('p');
    expect(names).toHaveTextContent(
      '김우진 · 박일하 · 김현정 · 신선우',
    );
    expect(names).not.toHaveClass('truncate', 'line-clamp-2');
    expect(names).toHaveClass('whitespace-normal', 'break-keep');
    expect(screen.getByText('+1')).toBeInTheDocument();
    expect(screen.queryByText('백엔드')).not.toBeInTheDocument();
  });

  it('단독 저자 글에는 기존처럼 직책을 표시한다', () => {
    render(<PostAuthor post={{ ...post, coauthors: [] }} />);

    expect(screen.getByText('백엔드')).toBeInTheDocument();
  });

  it('공동저자 글에서는 이미지는 그대로 두고 각 이름만 해당 멤버 모달을 연다', async () => {
    const user = userEvent.setup();
    render(<PostAuthor post={post} interactiveNames />);

    expect(screen.getAllByRole('button')).toHaveLength(4);
    await user.click(screen.getByRole('button', { name: '박일하님 소개 보기' }));

    expect(openMemberById).toHaveBeenCalledWith(2, expect.objectContaining({
      originRect: expect.anything(),
      fallbackName: '박일하',
    }));
  });
});
