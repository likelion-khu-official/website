import type {
  MemberErrorCode,
  MemberLoginRequest,
  MemberLoginResponse,
  MemberChangePasswordRequest,
  MemberChangePasswordResponse,
  MemberMeResponse,
} from '@shared/types/member-auth';
import type { Member } from '@shared/types/member';
import type {
  MemberProjectSummary,
  ProjectCreateRequest,
  ProjectDetail,
  ProjectErrorCode,
  ProjectReplaceRequest,
  ProjectSuccessResponse,
} from '@shared/types/project';
import type {
  FeedImageUploadResponse,
  MemberPostSummary,
  PostCreateRequest,
  PostDetail,
  PostErrorCode,
  PostReplaceRequest,
  PostSuccessResponse,
  SpringPage,
} from '@shared/types/feed';

/**
 * 모든 호출은 /api/member/* 상대경로. access_token/refresh_token은 HttpOnly 쿠키라
 * JS에서 못 만지고, 같은 오리진 fetch면 브라우저가 알아서 실어 보낸다.
 */

export class MemberApiError extends Error {
  status: number;
  code: MemberErrorCode | ProjectErrorCode | PostErrorCode | null;
  constructor(
    message: string,
    status: number,
    code: MemberErrorCode | ProjectErrorCode | PostErrorCode | null = null
  ) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

async function throwApiError(res: Response, fallbackMessage: string): Promise<never> {
  let message = fallbackMessage;
  let code: MemberErrorCode | ProjectErrorCode | PostErrorCode | null = null;
  try {
    const data = await res.json();
    if (data?.message) message = data.message;
    if (data?.code) code = data.code;
  } catch {
    // 바디가 JSON이 아니면 기본 메시지를 쓴다
  }
  throw new MemberApiError(message, res.status, code);
}

let refreshInFlight: Promise<boolean> | null = null;

async function refreshAccessToken() {
  if (!refreshInFlight) {
    refreshInFlight = fetch('/api/member/auth/refresh', {
      method: 'POST',
      credentials: 'same-origin',
    })
      .then((response) => response.ok)
      .catch(() => false)
      .finally(() => {
        refreshInFlight = null;
      });
  }
  return refreshInFlight;
}

/**
 * 멤버 권한이 필요한 요청의 공통 진입점.
 * access token 만료로 401이 오면 refresh cookie로 한 번만 갱신한 뒤 원 요청을 재시도한다.
 */
async function authenticatedFetch(path: string, init: RequestInit, retry = true) {
  const isFormData = init.body instanceof FormData;
  const res = await fetch(path, {
    ...init,
    credentials: 'same-origin',
    headers: {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...init.headers,
    },
  });

  if (
    res.status === 401 &&
    retry &&
    path !== '/api/member/auth/refresh' &&
    path !== '/api/member/auth/login'
  ) {
    const refreshed = await refreshAccessToken();
    if (refreshed) return authenticatedFetch(path, init, false);
  }

  return res;
}

async function request<T>(
  path: string,
  init: RequestInit,
  fallbackMessage: string,
  memberPrefix = true
): Promise<T> {
  const res = await authenticatedFetch(memberPrefix ? `/api/member${path}` : path, init);

  if (res.ok) {
    if (res.status === 204) return undefined as T;
    return res.json();
  }

  return throwApiError(res, fallbackMessage);
}

export function login(body: MemberLoginRequest) {
  return request<MemberLoginResponse>(
    '/auth/login',
    { method: 'POST', body: JSON.stringify(body) },
    '로그인에 실패했어요.'
  );
}

export function changePassword(body: MemberChangePasswordRequest) {
  return request<MemberChangePasswordResponse>(
    '/auth/password',
    { method: 'PATCH', body: JSON.stringify(body) },
    '비밀번호 변경에 실패했어요.'
  );
}

export function getCurrentMember() {
  return request<MemberMeResponse>(
    '/auth/me',
    { method: 'GET' },
    '로그인 상태를 확인하지 못했어요.'
  );
}

export function getMemberProjects() {
  return request<MemberProjectSummary[]>(
    '/projects',
    { method: 'GET' },
    '내 프로젝트를 불러오지 못했어요.'
  );
}

export function getMemberPosts(page = 0, size = 20) {
  return request<SpringPage<MemberPostSummary>>(
    `/posts?page=${page}&size=${size}`,
    { method: 'GET' },
    '내 글을 불러오지 못했어요.'
  );
}

export function getMemberPost(id: number) {
  return request<PostDetail>(
    `/posts/${id}`,
    { method: 'GET' },
    '글 편집 정보를 불러오지 못했어요.'
  );
}

export function createPost(body: PostCreateRequest) {
  return request<PostDetail>(
    '/api/posts',
    { method: 'POST', body: JSON.stringify(body) },
    '글 등록에 실패했어요.',
    false
  );
}

export function replacePost(id: number, body: PostReplaceRequest) {
  return request<PostDetail>(
    `/api/posts/${id}`,
    { method: 'PUT', body: JSON.stringify(body) },
    '글 수정에 실패했어요.',
    false
  );
}

export function deletePost(id: number) {
  return request<PostSuccessResponse>(
    `/api/posts/${id}`,
    { method: 'DELETE' },
    '글 삭제에 실패했어요.',
    false
  );
}

export function getMemberProject(id: number) {
  return request<ProjectDetail>(
    `/projects/${id}`,
    { method: 'GET' },
    '프로젝트 편집 정보를 불러오지 못했어요.'
  );
}

export function createProject(body: ProjectCreateRequest) {
  return request<ProjectDetail>(
    '/api/projects',
    { method: 'POST', body: JSON.stringify(body) },
    '프로젝트 등록에 실패했어요.',
    false
  );
}

export function replaceProject(id: number, body: ProjectReplaceRequest) {
  return request<ProjectDetail>(
    `/api/projects/${id}`,
    { method: 'PUT', body: JSON.stringify(body) },
    '프로젝트 수정에 실패했어요.',
    false
  );
}

export function deleteProject(id: number) {
  return request<ProjectSuccessResponse>(
    `/api/projects/${id}`,
    { method: 'DELETE' },
    '프로젝트 삭제에 실패했어요.',
    false
  );
}

export function getAllMembers() {
  return request<Member[]>(
    '/api/members',
    { method: 'GET' },
    '멤버 목록을 불러오지 못했어요.',
    false
  );
}

export async function uploadMemberImage(file: File): Promise<FeedImageUploadResponse> {
  const formData = new FormData();
  formData.append('file', file);
  const res = await authenticatedFetch('/api/feed/images', {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) return throwApiError(res, '이미지 업로드에 실패했어요.');
  return res.json();
}

export function uploadProjectImage(file: File) {
  return uploadMemberImage(file);
}
