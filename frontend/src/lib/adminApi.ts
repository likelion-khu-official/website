import type {
  AdminErrorCode,
  AdminLoginRequest,
  AdminLoginResponse,
  AdminRefreshResponse,
  AdminInvitationVerifyResponse,
  AdminInvitationAcceptRequest,
  AdminInvitationAcceptResponse,
  AdminPasswordForgotRequest,
  AdminPasswordForgotResponse,
  AdminPasswordResetVerifyResponse,
  AdminPasswordResetRequest,
  AdminPasswordResetResponse,
  AdminSummary,
  AdminInvitationCreateRequest,
  AdminInvitationSummary,
  AdminRoleUpdateRequest,
  AdminRoleUpdateResponse,
} from '@shared/types/admin';
import type { RecruitmentStatusResponse, RecruitmentStatusUpdateRequest } from '@shared/types/recruitment';

/**
 * 모든 호출은 /api/admin/* 상대경로. access_token/refresh_token은 HttpOnly 쿠키라
 * JS에서 못 만지고, 같은 오리진 fetch면 브라우저가 알아서 실어 보낸다.
 */

export class AdminApiError extends Error {
  status: number;
  code: AdminErrorCode | null;
  constructor(message: string, status: number, code: AdminErrorCode | null = null) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

async function throwApiError(res: Response, fallbackMessage: string): Promise<never> {
  let message = fallbackMessage;
  let code: AdminErrorCode | null = null;
  try {
    const data = await res.json();
    if (data?.message) message = data.message;
    if (data?.code) code = data.code;
  } catch {
    // 바디가 JSON이 아니면 기본 메시지를 쓴다
  }
  throw new AdminApiError(message, res.status, code);
}

let refreshInFlight: Promise<boolean> | null = null;

/** 동시에 여러 요청이 401을 받아도 refresh는 한 번만 시도하고 결과를 공유한다 */
function refreshAccessToken(): Promise<boolean> {
  if (!refreshInFlight) {
    refreshInFlight = fetch('/api/admin/auth/refresh', { method: 'POST' })
      .then((res) => res.ok)
      .catch(() => false)
      .finally(() => {
        refreshInFlight = null;
      });
  }
  return refreshInFlight;
}

/**
 * @param retryOn401 access 토큰 만료(401) 시 refresh 후 한 번 재요청할지.
 *   로그인 자체나 초대/재설정 같은 비세션 흐름은 재시도 대상이 아니라 false로 둔다.
 */
async function request<T>(
  path: string,
  init: RequestInit,
  fallbackMessage: string,
  retryOn401: boolean
): Promise<T> {
  const res = await fetch(`/api/admin${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init.headers },
  });

  if (res.ok) {
    if (res.status === 204) return undefined as T;
    return res.json();
  }

  if (res.status === 401 && retryOn401) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      return request<T>(path, init, fallbackMessage, false);
    }
  }

  return throwApiError(res, fallbackMessage);
}

// ── 인증 ──────────────────────────────────────────────────────────

export function login(body: AdminLoginRequest) {
  return request<AdminLoginResponse>(
    '/auth/login',
    { method: 'POST', body: JSON.stringify(body) },
    '로그인에 실패했어요.',
    false
  );
}

export function logout() {
  return request<void>('/auth/logout', { method: 'POST' }, '로그아웃에 실패했어요.', false);
}

/** 현재 세션 확인 + access 토큰 갱신을 겸한다 (별도 "me" 엔드포인트가 없음) */
export function refreshSession() {
  return request<AdminRefreshResponse>(
    '/auth/refresh',
    { method: 'POST' },
    '세션을 확인하지 못했어요.',
    false
  );
}

// ── 초대 ──────────────────────────────────────────────────────────

export function verifyInvitation(token: string) {
  return request<AdminInvitationVerifyResponse>(
    `/invitations/${encodeURIComponent(token)}/verify`,
    {},
    '초대 링크를 확인하지 못했어요.',
    false
  );
}

export function acceptInvitation(token: string, body: AdminInvitationAcceptRequest) {
  return request<AdminInvitationAcceptResponse>(
    `/invitations/${encodeURIComponent(token)}/accept`,
    { method: 'POST', body: JSON.stringify(body) },
    '가입 처리에 실패했어요.',
    false
  );
}

export function createInvitation(body: AdminInvitationCreateRequest) {
  return request<AdminInvitationSummary>(
    '/invitations',
    { method: 'POST', body: JSON.stringify(body) },
    '초대에 실패했어요.',
    true
  );
}

export function cancelInvitation(id: number) {
  return request<void>(`/invitations/${id}`, { method: 'DELETE' }, '초대 취소에 실패했어요.', true);
}

// ── 비밀번호 재설정 ────────────────────────────────────────────────

export function forgotPassword(body: AdminPasswordForgotRequest) {
  return request<AdminPasswordForgotResponse>(
    '/password/forgot',
    { method: 'POST', body: JSON.stringify(body) },
    '요청을 처리하지 못했어요.',
    false
  );
}

export function verifyPasswordReset(token: string) {
  return request<AdminPasswordResetVerifyResponse>(
    `/password/reset/${encodeURIComponent(token)}/verify`,
    {},
    '재설정 링크를 확인하지 못했어요.',
    false
  );
}

export function resetPassword(token: string, body: AdminPasswordResetRequest) {
  return request<AdminPasswordResetResponse>(
    `/password/reset/${encodeURIComponent(token)}`,
    { method: 'POST', body: JSON.stringify(body) },
    '비밀번호 재설정에 실패했어요.',
    false
  );
}

// ── 운영진 관리 ────────────────────────────────────────────────────

export function listAdmins() {
  return request<AdminSummary[]>('/admins', {}, '운영진 목록을 불러오지 못했어요.', true);
}

export function deleteAdmin(id: number) {
  return request<void>(`/admins/${id}`, { method: 'DELETE' }, '삭제에 실패했어요.', true);
}

export function updateAdminRole(id: number, body: AdminRoleUpdateRequest) {
  return request<AdminRoleUpdateResponse>(
    `/admins/${id}/role`,
    { method: 'PATCH', body: JSON.stringify(body) },
    '역할 변경에 실패했어요.',
    true
  );
}

// ── 모집 관리 (#151) ──────────────────────────────────────────────

export function getRecruitmentStatus() {
  return request<RecruitmentStatusResponse>('/recruitment/status', {}, '모집 상태를 불러오지 못했어요.', true);
}

export function updateRecruitmentStatus(body: RecruitmentStatusUpdateRequest) {
  return request<RecruitmentStatusResponse>(
    '/recruitment/status',
    { method: 'PATCH', body: JSON.stringify(body) },
    '모집 상태 변경에 실패했어요.',
    true
  );
}
