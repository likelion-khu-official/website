// 프로젝트 쇼케이스 계약 — FE↔BE 합의 파일 (#119)
// 변경 시 양 팀 합의 필요 (shared/ 규칙)
// 이미지는 이 계약이 새로 만드는 게 아니라 기존 POST /api/feed/images(OCI 업로드)로 먼저 올려서
// 받은 url을 그대로 담는다 — Member.photoUrl과 같은 패턴.

// member.ts의 MemberRole과 같은 값 — shared/ 파일은 서로 import하지 않는 관례라 그대로 다시 선언한다.
export type ProjectPart = 'PM' | 'FE' | 'BE' | 'DESIGN' | 'INFRA';

export interface ProjectImage {
  id: number; // DELETE /api/projects/{id}/images/{imageId}에 이 값을 쓴다.
  url: string;
  representative: boolean; // 목록 카드엔 이 이미지만 노출. 항상 최대 1장(addImage가 자동으로 보장).
}

export interface ProjectParticipant {
  id: number; // DELETE /api/projects/{id}/participants/{participantId}에 이 값을 쓴다 — memberId가 아니다.
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

/**
 * PATCH /api/projects/{id} — 참여 멤버 본인만. 넘긴 필드만 바뀐다(cohort는 불변이라 없음).
 * images/participants는 여기 없다 — 통째 교체 대신 아래 하위 리소스 엔드포인트로 개별 추가·삭제한다.
 */
export interface ProjectUpdateRequest {
  title?: string;
  summary?: string;
  techStack?: string[];
  githubUrl?: string;
  startDate?: string;
  endDate?: string;
}

export interface ProjectImageRequest {
  url: string;
  representative: boolean;
}

export interface ProjectParticipantRequest {
  memberId: number;
  part: ProjectPart;
}

/**
 * POST /api/projects/{id}/images — 이미지 추가(참여자 본인만). 201, 응답은 항상 최신 ProjectDetail.
 * representative=true로 추가하면 기존 대표는 서버가 자동으로 해제한다(따로 먼저 해제할 필요 없음).
 */
export type ProjectImageAddRequest = ProjectImageRequest;
export type ProjectImageAddResponse = ProjectDetail;

/**
 * DELETE /api/projects/{id}/images/{imageId} — 이미지 삭제(참여자 본인만). 200, 응답은 ProjectDetail.
 * 대표 이미지를 지워도 막지 않는다 — 대표 없음(0장) 상태가 될 수 있고, 다음 대표는
 * addImage(representative=true)로 다시 명시적으로 지정해야 한다(자동 승격 없음).
 */
export type ProjectImageRemoveResponse = ProjectDetail;

/**
 * POST /api/projects/{id}/participants — 참여자 추가(참여자 본인만). 201, 응답은 ProjectDetail.
 * 이미 참여 중인 memberId를 또 넣으면 400.
 */
export type ProjectParticipantAddRequest = ProjectParticipantRequest;
export type ProjectParticipantAddResponse = ProjectDetail;

/**
 * DELETE /api/projects/{id}/participants/{participantId} — 참여자 삭제. 200, 응답은 ProjectDetail.
 * 참여자면 누구든(본인 포함) 다른 참여자를 뺄 수 있다 — "내가 참여한 프로젝트를 수정"이라는
 * 기존 철학과 동일한 느슨한 공동편집 모델. 다만 최소 1명은 항상 남아야 한다(마지막 1명이면 400).
 */
export type ProjectParticipantRemoveResponse = ProjectDetail;

/** PATCH /api/admin/projects/{id}/hidden — 관리자 이상만 */
export interface ProjectHiddenUpdateRequest {
  hidden: boolean;
}

/** DELETE /api/projects/{id}, PATCH /api/admin/projects/{id}/hidden 공통 응답 */
export interface ProjectSuccessResponse {
  success: true;
}
