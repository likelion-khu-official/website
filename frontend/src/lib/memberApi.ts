import type {
  MemberErrorCode,
  MemberLoginRequest,
  MemberLoginResponse,
  MemberChangePasswordRequest,
  MemberChangePasswordResponse,
} from '@shared/types/member-auth';

/**
 * 모든 호출은 /api/member/* 상대경로. access_token/refresh_token은 HttpOnly 쿠키라
 * JS에서 못 만지고, 같은 오리진 fetch면 브라우저가 알아서 실어 보낸다.
 */

export class MemberApiError extends Error {
  status: number;
  code: MemberErrorCode | null;
  constructor(message: string, status: number, code: MemberErrorCode | null = null) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

async function throwApiError(res: Response, fallbackMessage: string): Promise<never> {
  let message = fallbackMessage;
  let code: MemberErrorCode | null = null;
  try {
    const data = await res.json();
    if (data?.message) message = data.message;
    if (data?.code) code = data.code;
  } catch {
    // 바디가 JSON이 아니면 기본 메시지를 쓴다
  }
  throw new MemberApiError(message, res.status, code);
}

async function request<T>(path: string, init: RequestInit, fallbackMessage: string): Promise<T> {
  const res = await fetch(`/api/member${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init.headers },
  });

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
