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
