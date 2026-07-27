// 멤버 API 계약 — FE↔BE 합의 파일
// 변경 시 양 팀 합의 필요 (shared/ 규칙)

export type MemberRole = 'PM' | 'FE' | 'BE' | 'DESIGN' | 'INFRA';

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

/** PATCH /api/admin/members/{id} — cohort·emoji는 불변이라 DTO에 없음 */
export interface MemberUpdateRequest {
  name?: string;
  roles?: MemberRole[];
  photoUrl?: string;
  joinReason?: string;
}

/**
 * GET /api/admin/members, POST /api/admin/members, PATCH /api/admin/members/{id} 응답 공용(#145).
 * 공개 Member와 달리 로그인 아이디(studentId)·오프보딩 여부를 담는다 — phone(초기 비밀번호 원본)은
 * 화면에 보일 이유가 없어 여기서도 노출하지 않는다.
 */
export interface MemberAdminSummary extends Member {
  studentId: string;
  offboarded: boolean;
}
