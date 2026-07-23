import type {
  SpringPage,
  PostSummary,
  PostDetail,
  PostCreateRequest,
  Comment,
  CommentCreateRequest,
  FeedImageUploadResponse,
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

export async function getPosts(page: number, baseUrl = ''): Promise<SpringPage<PostSummary>> {
  const res = await fetch(`${baseUrl}/api/posts?page=${page}`, { cache: 'no-store' });
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

export async function createPost(body: PostCreateRequest, token: string): Promise<PostDetail> {
  const res = await fetch('/api/posts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Magic-Token': token },
    body: JSON.stringify(body),
  });
  return parseJsonOrThrow(res, '글 작성에 실패했어요.');
}

/** XHR로 업로드 진행률을 추적한다 (fetch는 업로드 progress 이벤트가 없음) */
export function uploadImage(
  file: File,
  onProgress?: (percent: number) => void
): Promise<FeedImageUploadResponse> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/feed/images');

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(JSON.parse(xhr.responseText));
        } catch {
          reject(new FeedApiError('이미지 업로드 응답을 해석하지 못했어요.', xhr.status));
        }
      } else {
        let message = '이미지 업로드에 실패했어요.';
        try {
          const data = JSON.parse(xhr.responseText);
          if (data?.message) message = data.message;
        } catch {
          // 무시 — 기본 메시지 사용
        }
        reject(new FeedApiError(message, xhr.status));
      }
    };

    xhr.onerror = () => reject(new FeedApiError('네트워크 오류로 이미지 업로드에 실패했어요.', 0));

    const formData = new FormData();
    formData.append('file', file);
    xhr.send(formData);
  });
}
