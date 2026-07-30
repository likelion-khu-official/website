// 멤버 API 계약 — FE↔BE 합의 파일
// 변경 시 양 팀 합의 필요 (shared/ 규칙)

export type MemberRole =
  // 운영진
  | 'PRESIDENT'       // 회장
  | 'VICE_PRESIDENT'  // 부회장
  | 'BACKEND_LEAD'    // 백엔드 세션장
  | 'FRONTEND_LEAD'   // 프론트엔드 세션장
  | 'DESIGN_LEAD'     // 디자인 세션장
  | 'AI_LEAD'         // AI 세션장
  | 'PLANNING_HEAD'   // 기획부장
  | 'PLANNING_MEMBER' // 기획부원
  | 'PR_HEAD'         // 홍보부장
  | 'PR_MEMBER'       // 홍보부원
  // 멤버
  | 'BACKEND'         // 백엔드
  | 'FRONTEND'        // 프론트엔드
  | 'DESIGN'          // 디자인
  | 'AI';             // AI

/** GET /api/members — 공개 전체 목록 */
export interface Member {
  id: number;
  name: string;
  roles: MemberRole[];
  cohort: number;
  emoji: string;
  photoUrl: string | null;
  joinReason: string | null;
}

/** POST /api/admin/members — studentId·phone은 로그인 계정 발급용(#117). 초기 비번=phone을 서버가 해시한다. */
export interface MemberCreateRequest {
  name: string;
  roles: MemberRole[];
  cohort: number;
  photoUrl?: string;
  joinReason?: string;
  studentId: string;
  phone: string;
}

/** POST /api/admin/members/bulk — 붙여넣은 JSON 배열을 원자적으로 등록한다. */
export interface MemberBulkCreateRequest {
  members: MemberCreateRequest[];
}

export interface MemberBulkCreateResponse {
  count: number;
  members: MemberAdminSummary[];
}

/** PATCH /api/admin/members/{id} — cohort·emoji는 불변이라 DTO에 없음 */
export interface MemberUpdateRequest {
  name?: string;
  roles?: MemberRole[];
  photoUrl?: string;
  joinReason?: string;
}

/** GET /api/admin/members — 관리자 전용 멤버 상세 (studentId·오프보딩 상태 포함) */
export interface MemberAdminSummary {
  id: number;
  name: string;
  roles: MemberRole[];
  cohort: number;
  emoji: string;
  photoUrl: string | null;
  joinReason: string | null;
  department: string | null;
  studentId: string;
  publicationConsent: boolean;
  publicationConsentedAt: string | null;
  offboarded: boolean;
}
