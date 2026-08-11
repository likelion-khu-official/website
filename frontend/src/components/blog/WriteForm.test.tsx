import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PostDetail } from '@shared/types/feed';
import WriteForm from './WriteForm';

const { createPostMock, pushMock } = vi.hoisted(() => ({
  createPostMock: vi.fn(),
  pushMock: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock, replace: vi.fn(), refresh: vi.fn() }),
}));
vi.mock('@/lib/memberApi', () => ({
  createPost: createPostMock,
  getCurrentMember: vi.fn().mockResolvedValue({
    member: { id: 1, studentId: '20260001', name: '김우진', mustChangePassword: false, role: 'MEMBER' },
  }),
  getAllMembers: vi.fn().mockResolvedValue([
    { id: 1, name: '김우진', roles: ['BACKEND'], cohort: 14, emoji: '🦁', photoUrl: null, joinReason: null },
    { id: 2, name: '박일하', roles: ['FRONTEND'], cohort: 14, emoji: '🦊', photoUrl: null, joinReason: null },
  ]),
  getMemberPost: vi.fn(),
  replacePost: vi.fn(),
  uploadMemberImage: vi.fn(),
  MemberApiError: class MemberApiError extends Error {},
}));
vi.mock('./MarkdownContent', () => ({
  default: ({ content }: { content: string }) => <div>{content}</div>,
  markdownIncludesImage: () => false,
}));

const savedPost: PostDetail = {
  id: 10,
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
  ],
  coauthorMemberIds: [2],
  status: 'PUBLISHED',
  publishedAt: '2026-08-11T00:00:00Z',
  createdAt: '2026-08-11T00:00:00Z',
  updatedAt: '2026-08-11T00:00:00Z',
  content: '본문',
  commentCount: 0,
};

describe('WriteForm 공동저자 선택', () => {
  beforeEach(() => {
    localStorage.clear();
    createPostMock.mockReset().mockResolvedValue(savedPost);
    pushMock.mockReset();
  });

  it('출간 설정에서 멤버를 검색해 공동저자로 저장한다', async () => {
    const user = userEvent.setup();
    render(<WriteForm />);

    fireEvent.change(await screen.findByRole('textbox', { name: '제목' }), {
      target: { value: '함께 쓴 글' },
    });
    fireEvent.change(screen.getByLabelText('본문'), { target: { value: '본문' } });
    await user.click(screen.getByRole('button', { name: '출간하기' }));

    const dialog = screen.getByRole('dialog', { name: '출간 설정' });
    expect(within(dialog).getByText('김우진')).toBeInTheDocument();
    expect(within(dialog).getByText(/수정·삭제 권한은 생기지 않아요/)).toBeInTheDocument();

    await user.type(within(dialog).getByRole('searchbox', { name: /공동저자/ }), '박일하');
    await user.click(within(dialog).getByRole('button', { name: /박일하/ }));
    expect(within(dialog).getByLabelText('선택한 공동저자')).toHaveTextContent('박일하');

    await user.click(within(dialog).getByRole('button', { name: '출간하기' }));

    await waitFor(() => expect(createPostMock).toHaveBeenCalledWith(expect.objectContaining({
      title: '함께 쓴 글',
      content: '본문',
      coauthorMemberIds: [2],
    })));
    expect(pushMock).toHaveBeenCalledWith('/blog/together');
  });
});
