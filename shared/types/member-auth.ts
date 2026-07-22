// 멤버(학번 로그인) 인증 계약 — FE↔BE 합의 파일 (#117)
// 변경 시 양 팀 합의 필요 (shared/ 규칙)
// 참고: access_token/refresh_token은 Set-Cookie(HttpOnly)로만 전달되며 JSON 바디엔 노출되지 않는다.
//   admin.ts의 어드민(이메일) 로그인과는 별도 계정 체계 — 쿠키 이름은 같지만 refresh_token의 Path가
//   /api/member/auth라 두 세션은 서로 간섭하지 않는다.

// MemberRole(member.ts, PM/FE/BE/DESIGN/INFRA — 공개 프로필의 팀 직군)과는 다른 개념 — 이건
// 인증 등급(4단계: 비로그인/MEMBER/ADMIN/SUPER_ADMIN 중 멤버 로그인이 발급하는 등급)이라 이름을 분리했다.
export type MemberAuthRole = 'MEMBER';

export type MemberErrorCode =
  | 'INVALID_CREDENTIALS'
  | 'ACCOUNT_LOCKED'
  | 'INVALID_REFRESH_TOKEN'
  | 'UNAUTHENTICATED'
  | 'FORBIDDEN'
  | 'WEAK_PASSWORD'
  | 'MUST_CHANGE_PASSWORD'
  | 'NOT_FOUND';

/** 모든 에러 응답 공통 형태 */
export interface MemberErrorResponse {
  success: false;
  message: string;
  code: MemberErrorCode;
}

export interface MemberAccount {
  id: number;
  studentId: string;
  name: string;
  mustChangePassword: boolean;
  role: MemberAuthRole;
}

/** POST /api/member/auth/login */
export interface MemberLoginRequest {
  studentId: string;
  password: string;
}
export interface MemberLoginResponse {
  member: MemberAccount;
}

/** POST /api/member/auth/logout */
export interface MemberLogoutResponse {
  success: true;
}

/** POST /api/member/auth/refresh */
export interface MemberRefreshResponse {
  member: MemberAccount;
}

/**
 * PATCH /api/member/auth/password — 본인 비밀번호 변경(첫 로그인 강제 변경도 동일 엔드포인트).
 * mustChangePassword=true인 동안엔 이 요청 전까지 다른 API가 전부 403(MUST_CHANGE_PASSWORD)으로 막힌다.
 * currentPassword 불일치 시 401 INVALID_CREDENTIALS.
 *
 * 첫 로그인 강제 변경 화면에서 FE는 currentPassword 입력창을 따로 안 보여줘도 된다 — 로그인 폼에
 * 사용자가 입력한 값(초기값=전화번호)을 그대로 currentPassword에 실어 보내면 된다. 사용자 눈엔
 * "새 비밀번호" 입력창 하나만 보이지만, 서버는 항상 현재 비밀번호 검증을 요구해 계정 탈취를 막는다.
 */
export interface MemberChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}
export interface MemberChangePasswordResponse {
  member: MemberAccount;
}

/** GET /api/member/auth/me — 로그인 상태 확인 + 현재 세션 멤버 정보. 비로그인 시 401. */
export interface MemberMeResponse {
  member: MemberAccount;
}

/** POST /api/admin/members/:id/password/reset — 관리자(ADMIN 이상)가 초기화. 비번=전화번호로 되돌아간다(재설정 메일 없음). */
export interface MemberPasswordResetResponse {
  success: true;
}
