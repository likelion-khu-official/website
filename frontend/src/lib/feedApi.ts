import type {
  SpringPage,
  PostSummary,
  PostDetail,
  Comment,
  CommentCreateRequest,
} from '@shared/types/feed';

/**
 * 모든 호출은 /api/* 상대경로 — 서버 컴포넌트에서 쓸 땐 baseUrl(getBaseUrl())을
 * 앞에 붙여 이 서버 자신을 향한 절대 URL을 만든다(fetch는 상대경로를 못 받음).
 * 클라이언트 컴포넌트에서는 baseUrl 없이(빈 문자열) 브라우저가 상대경로를 그대로 resolve.
 */

export class FeedApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function parseJsonOrThrow<T>(res: Response, fallbackMessage: string): Promise<T> {
  if (!res.ok) {
    let message = fallbackMessage;
    try {
      const data = await res.json();
      if (data?.message) message = data.message;
    } catch {
      // 응답 바디가 JSON이 아니면 기본 메시지를 쓴다
    }
    throw new FeedApiError(message, res.status);
  }
  return res.json();
}

export async function getPosts(
  page: number,
  baseUrl = '',
  size?: number,
): Promise<SpringPage<PostSummary>> {
  const params = new URLSearchParams({ page: String(page) });
  if (size !== undefined) params.set('size', String(size));
  const res = await fetch(`${baseUrl}/api/posts?${params}`, { cache: 'no-store' });
  return parseJsonOrThrow(res, '글 목록을 불러오지 못했어요.');
}

export async function getPostBySlug(slug: string, baseUrl = ''): Promise<PostDetail | null> {
  const res = await fetch(`${baseUrl}/api/posts/${encodeURIComponent(slug)}`, {
    cache: 'no-store',
  });
  if (res.status === 404) return null;
  return parseJsonOrThrow(res, '글을 불러오지 못했어요.');
}

export async function getComments(postId: number, baseUrl = ''): Promise<Comment[]> {
  const res = await fetch(`${baseUrl}/api/posts/${postId}/comments`, { cache: 'no-store' });
  return parseJsonOrThrow(res, '댓글을 불러오지 못했어요.');
}

export async function createComment(
  postId: number,
  body: CommentCreateRequest
): Promise<Comment> {
  const res = await fetch(`/api/posts/${postId}/comments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return parseJsonOrThrow(res, '댓글 작성에 실패했어요.');
}
