// 어드민 인증·초대 계약 — FE↔BE 합의 파일
// 변경 시 양 팀 합의 필요 (shared/ 규칙)
// 참고: access_token/refresh_token은 Set-Cookie(HttpOnly)로만 전달되며 JSON 바디엔 노출되지 않는다.

export type AdminRole = 'SUPER_ADMIN' | 'ADMIN';
export type AdminStatus = 'ACTIVE' | 'LOCKED';
export type InvitationStatus = 'PENDING' | 'ACCEPTED' | 'CANCELLED' | 'EXPIRED';

export type AdminErrorCode =
  | 'INVALID_CREDENTIALS'
  | 'ACCOUNT_LOCKED'
  | 'INVALID_REFRESH_TOKEN'
  | 'UNAUTHENTICATED'
  | 'FORBIDDEN'
  | 'INVALID_EMAIL_DOMAIN'
  | 'ALREADY_MEMBER'
  | 'NOT_FOUND'
  | 'INVALID_TOKEN'
  | 'EXPIRED_TOKEN'
  | 'WEAK_PASSWORD'
  | 'LAST_SUPER_ADMIN';

/** 모든 에러 응답 공통 형태 */
export interface AdminErrorResponse {
  success: false;
  message: string;
  code: AdminErrorCode;
}

export interface AdminAccount {
  id: number;
  email: string;
  name: string;
  role: AdminRole;
}

// ── 인증 ──────────────────────────────────────────────────────────

/** POST /api/admin/auth/login */
export interface AdminLoginRequest {
  email: string;
  password: string;
}
export interface AdminLoginResponse {
  admin: AdminAccount;
}

/** POST /api/admin/auth/logout */
export interface AdminLogoutResponse {
  success: true;
}

/** POST /api/admin/auth/refresh — 신규(#90 표엔 없음, refresh 토큰을 실제로 쓰기 위해 필요) */
export interface AdminRefreshResponse {
  admin: AdminAccount;
}

// ── 초대 ──────────────────────────────────────────────────────────

/** POST /api/admin/invitations */
export interface AdminInvitationCreateRequest {
  email: string;
}

/** POST /api/admin/invitations 응답 및 GET /api/admin/invitations 목록 항목 공용 */
export interface AdminInvitationSummary {
  id: number;
  email: string;
  status: InvitationStatus;
  invitedBy: string; // 초대한 SUPER_ADMIN의 이메일 (초대 시점 스냅샷)
  expiresAt: string; // ISO-8601
}

/** GET /api/admin/invitations/:token/verify */
export interface AdminInvitationVerifyResponse {
  email: string;
}

/** POST /api/admin/invitations/:token/accept */
export interface AdminInvitationAcceptRequest {
  name: string;
  password: string;
}
export interface AdminInvitationAcceptResponse {
  id: number;
  email: string;
  role: 'ADMIN';
}

// ── 비밀번호 재설정 ────────────────────────────────────────────────

/** POST /api/admin/password/forgot — 이메일 존재 여부와 무관하게 응답 동일 */
export interface AdminPasswordForgotRequest {
  email: string;
}
export interface AdminPasswordForgotResponse {
  message: string;
}

/** GET /api/admin/password/reset/:token/verify */
export interface AdminPasswordResetVerifyResponse {
  email: string;
}

/** POST /api/admin/password/reset/:token */
export interface AdminPasswordResetRequest {
  password: string;
}
export interface AdminPasswordResetResponse {
  success: true;
}

// ── 운영진 관리 ────────────────────────────────────────────────────

/** GET /api/admin/admins */
export interface AdminSummary {
  id: number;
  email: string;
  name: string;
  role: AdminRole;
  status: AdminStatus; // ACTIVE | LOCKED — 파생값, 저장값 아님
}

/** DELETE /api/admin/admins/:id */
export interface AdminDeleteResponse {
  success: true;
}

/** PATCH /api/admin/admins/:id/role */
export interface AdminRoleUpdateRequest {
  role: AdminRole;
}
export interface AdminRoleUpdateResponse {
  id: number;
  role: AdminRole;
}
