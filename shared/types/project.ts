// 프로젝트 쇼케이스 계약 — FE↔BE 합의 파일 (#119)
// 변경 시 양 팀 합의 필요 (shared/ 규칙)
// 이미지는 이 계약이 새로 만드는 게 아니라 기존 POST /api/feed/images(OCI 업로드)로 먼저 올려서
// 받은 url을 그대로 담는다 — Member.photoUrl과 같은 패턴.

// member.ts의 MemberRole과 같은 값 — shared/ 파일은 서로 import하지 않는 관례라 그대로 다시 선언한다.
export type ProjectPart = 'PM' | 'FE' | 'BE' | 'DESIGN' | 'INFRA';

export interface ProjectImage {
  url: string;
  representative: boolean; // 목록 카드엔 이 이미지만 노출. 전체 이미지 중 정확히 1장이어야 한다.
}

export interface ProjectParticipant {
  memberId: number;
  name: string;
  part: ProjectPart; // 이 프로젝트에서 맡은 역할 — Member.roles(조직 전체 역할)와 다를 수 있다.
}

/** GET /api/projects — 공개 목록 카드용 */
export interface ProjectSummary {
  id: number;
  title: string;
  summary: string;
  representativeImageUrl: string | null; // 대표 이미지가 없으면 null
  cohort: number;
  techStack: string[];
}

/** GET /api/projects/{id} — 공개 상세 */
export interface ProjectDetail {
  id: number;
  title: string;
  summary: string;
  images: ProjectImage[];
  participants: ProjectParticipant[];
  cohort: number;
  startDate: string | null; // ISO 8601 date (YYYY-MM-DD)
  endDate: string | null;   // null이면 진행 중
  techStack: string[];
  githubUrl: string | null;
  hidden: boolean;
}

/**
 * POST /api/projects — 참여 프로젝트 등록 (로그인한 멤버, hasRole('MEMBER')).
 * participants에 요청자 본인이 반드시 포함돼야 한다(안 그러면 400).
 */
export interface ProjectCreateRequest {
  title: string;
  summary: string;
  cohort: number;
  techStack?: string[];
  githubUrl?: string;
  startDate?: string;
  endDate?: string;
  images?: ProjectImageRequest[];
  participants: ProjectParticipantRequest[];
}

/** PATCH /api/projects/{id} — 참여 멤버 본인만. 넘긴 필드만 바뀐다(cohort는 불변이라 없음). */
export interface ProjectUpdateRequest {
  title?: string;
  summary?: string;
  techStack?: string[];
  githubUrl?: string;
  startDate?: string;
  endDate?: string;
  images?: ProjectImageRequest[];      // 넘기면 기존 이미지 전체를 이걸로 교체
  participants?: ProjectParticipantRequest[]; // 넘기면 기존 참여자 전체를 이걸로 교체(최소 1명)
}

export interface ProjectImageRequest {
  url: string;
  representative: boolean;
}

export interface ProjectParticipantRequest {
  memberId: number;
  part: ProjectPart;
}

/** PATCH /api/admin/projects/{id}/hidden — 관리자 이상만 */
export interface ProjectHiddenUpdateRequest {
  hidden: boolean;
}

/** DELETE /api/projects/{id}, PATCH /api/admin/projects/{id}/hidden 공통 응답 */
export interface ProjectSuccessResponse {
  success: true;
}
