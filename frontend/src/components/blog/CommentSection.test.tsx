import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Comment } from '@shared/types/feed';
import { FeedApiError } from '@/lib/feedApi';
import CommentSection from './CommentSection';

const { getCommentsMock, createCommentMock } = vi.hoisted(() => ({
  getCommentsMock: vi.fn(),
  createCommentMock: vi.fn(),
}));

vi.mock('@/lib/feedApi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/feedApi')>();
  return {
    ...actual,
    getComments: getCommentsMock,
    createComment: createCommentMock,
  };
});

const firstComment: Comment = {
  id: 1,
  nickname: null,
  content: '첫 번째 댓글',
  createdAt: '2026-08-01T09:00:00+09:00',
  hidden: false,
};

const namedComment: Comment = {
  id: 2,
  nickname: '아기사자',
  content: '두 번째 댓글',
  createdAt: '2026-08-01T10:30:00+09:00',
  hidden: false,
};

const hiddenComment: Comment = {
  id: 3,
  nickname: '노출되면 안 되는 이름',
  content: '노출되면 안 되는 원문',
  createdAt: '2026-08-01T11:00:00+09:00',
  hidden: true,
};

beforeEach(() => {
  vi.clearAllMocks();
  getCommentsMock.mockResolvedValue([]);
});

describe('CommentSection', () => {
  it('초기 조회 전에는 작성 폼을 막아 GET과 POST가 경합하지 않게 한다', async () => {
    let resolveComments: (comments: Comment[]) => void = () => undefined;
    getCommentsMock.mockReturnValue(
      new Promise<Comment[]>((resolve) => {
        resolveComments = resolve;
      }),
    );
    const user = userEvent.setup();

    render(<CommentSection postId={7} initialCount={2} />);

    const contentInput = screen.getByLabelText(/댓글 내용/);
    expect(contentInput).toBeDisabled();
    expect(screen.getByRole('button', { name: '댓글 등록' })).toBeDisabled();
    expect(screen.getByLabelText('공개 댓글 2개')).toBeInTheDocument();

    await user.type(contentInput, '등록되지 않아야 해요');
    expect(createCommentMock).not.toHaveBeenCalled();

    resolveComments([]);
    expect(await screen.findByText('아직 댓글이 없어요.')).toBeInTheDocument();
    expect(contentInput).toBeEnabled();
  });

  it('공개 댓글만 세고 응답 순서를 유지하며 가려진 원문은 표시하지 않는다', async () => {
    getCommentsMock.mockResolvedValue([firstComment, hiddenComment, namedComment]);
    const { container } = render(<CommentSection postId={7} initialCount={3} />);

    const list = await screen.findByRole('list', { name: '댓글 목록' });
    const items = within(list).getAllByRole('listitem');

    expect(screen.getByLabelText('공개 댓글 2개')).toBeInTheDocument();
    expect(items[0]).toHaveTextContent('첫 번째 댓글');
    expect(items[1]).toHaveTextContent('관리자에 의해 가려진 댓글입니다.');
    expect(items[2]).toHaveTextContent('두 번째 댓글');
    expect(screen.queryByText('노출되면 안 되는 이름')).not.toBeInTheDocument();
    expect(screen.queryByText('노출되면 안 되는 원문')).not.toBeInTheDocument();
    expect(container.querySelectorAll('time')).toHaveLength(3);
  });

  it('보이는 라벨과 길이 제한을 제공하고 공백뿐인 댓글은 제출하지 않는다', async () => {
    const user = userEvent.setup();
    render(<CommentSection postId={7} initialCount={0} />);
    await screen.findByText('아직 댓글이 없어요.');

    const contentInput = screen.getByLabelText(/댓글 내용/);
    const nicknameInput = screen.getByLabelText(/닉네임/);
    const submitButton = screen.getByRole('button', { name: '댓글 등록' });

    expect(contentInput).toHaveAttribute('maxLength', '300');
    expect(contentInput).toHaveAttribute(
      'aria-describedby',
      'comment-content-hint comment-content-count',
    );
    expect(nicknameInput).toHaveAttribute('maxLength', '50');
    expect(submitButton).toBeDisabled();

    await user.type(contentInput, '   ');
    expect(submitButton).toBeDisabled();
    expect(createCommentMock).not.toHaveBeenCalled();
  });

  it('등록 성공을 알리고 새 댓글과 공개 댓글 수를 새로고침 없이 갱신한다', async () => {
    const created: Comment = {
      id: 4,
      nickname: '우진',
      content: '새 댓글입니다.',
      createdAt: '2026-08-01T12:00:00+09:00',
      hidden: false,
    };
    createCommentMock.mockResolvedValue(created);
    const user = userEvent.setup();
    render(<CommentSection postId={7} initialCount={0} />);
    await screen.findByText('아직 댓글이 없어요.');

    const nicknameInput = screen.getByLabelText(/닉네임/);
    const contentInput = screen.getByLabelText(/댓글 내용/);
    await user.type(nicknameInput, '  우진  ');
    await user.type(contentInput, '  새 댓글입니다.  ');
    await user.click(screen.getByRole('button', { name: '댓글 등록' }));

    expect(await screen.findByRole('status')).toHaveTextContent('댓글을 남겼어요.');
    expect(screen.getByText('새 댓글입니다.')).toBeInTheDocument();
    expect(screen.getByText('방금 등록')).toBeInTheDocument();
    expect(screen.getByLabelText('공개 댓글 1개')).toBeInTheDocument();
    expect(nicknameInput).toHaveValue('');
    expect(contentInput).toHaveValue('');
    expect(createCommentMock).toHaveBeenCalledWith(7, {
      nickname: '우진',
      content: '새 댓글입니다.',
    });
  });

  it('등록 실패는 alert로 알리고 입력을 보존하며 수정하면 지난 오류를 지운다', async () => {
    createCommentMock.mockRejectedValue(new FeedApiError('잠시 후 다시 시도해 주세요.', 429));
    const user = userEvent.setup();
    render(<CommentSection postId={7} initialCount={0} />);
    await screen.findByText('아직 댓글이 없어요.');

    const nicknameInput = screen.getByLabelText(/닉네임/);
    const contentInput = screen.getByLabelText(/댓글 내용/);
    await user.type(nicknameInput, '익명친구');
    await user.type(contentInput, '지워지면 안 되는 댓글');
    await user.click(screen.getByRole('button', { name: '댓글 등록' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('잠시 후 다시 시도해 주세요.');
    expect(nicknameInput).toHaveValue('익명친구');
    expect(contentInput).toHaveValue('지워지면 안 되는 댓글');

    await user.type(contentInput, '!');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('조회 실패에서 다시 시도해 댓글 목록과 작성 폼을 복구한다', async () => {
    getCommentsMock
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValueOnce([firstComment]);
    const user = userEvent.setup();
    render(<CommentSection postId={7} initialCount={1} />);

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('댓글을 불러오지 못했어요.');
    expect(screen.getByLabelText(/댓글 내용/)).toBeDisabled();

    await user.click(within(alert).getByRole('button', { name: '다시 시도' }));

    expect(await screen.findByText('첫 번째 댓글')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByLabelText(/댓글 내용/)).toBeEnabled());
    expect(getCommentsMock).toHaveBeenCalledTimes(2);
  });
});
