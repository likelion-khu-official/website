// 운영진 소개 API 계약 — FE↔BE 합의 파일
// 변경 시 양 팀 합의 필요 (shared/ 규칙)
//
// 이름 확정: Staff. 권한 레벨 admin(예: /api/admin/...)과 리소스명이 겹치는 걸 피하려고
// "운영진" 리소스는 Admin이 아니라 Staff로 부른다 (이슈 #87).

/** GET /api/staff — 공개 전체 목록, sortOrder 오름차순(동률 시 id 오름차순) */
export interface Staff {
  id: number;
  name: string;
  position: string;
  department: string;
  admissionYear: number;
  photoUrl: string;
  introduction: string | null;
  /** 운영진 활동 이력. 없으면 빈 배열. 랜딩 카드에 순서대로 노출된다. */
  activities: string[];
  sortOrder: number;
}

/**
 * POST /api/admin/staff — 관리자 전용.
 * phone은 저장만 하고 응답하지 않으며, publicationConsent=true이면 publicationConsentedAt도 함께 보낸다.
 */
export interface StaffCreateRequest {
  name: string;
  position: string;
  department: string;
  admissionYear: number;
  photoUrl: string;
  introduction?: string;
  activities?: string[];
  sortOrder: number;
  studentId?: string;
  phone?: string;
  publicationConsent?: boolean;
  publicationConsentedAt?: string;
}

/** PATCH /api/admin/staff/{id} — 관리자 전용. name·department·admissionYear는 등록 후 불변 */
export interface StaffUpdateRequest {
  position?: string;
  photoUrl?: string;
  introduction?: string;
  /** null이 아니라 값이 오면 활동을 통째로 교체한다. */
  activities?: string[];
  sortOrder?: number;
  studentId?: string;
  phone?: string;
  publicationConsent?: boolean;
  publicationConsentedAt?: string;
}

/** GET /api/admin/staff와 관리자 생성·수정 응답. phone은 저장만 하고 응답하지 않는다. */
export interface StaffAdminSummary extends Staff {
  studentId: string | null;
  publicationConsent: boolean;
  publicationConsentedAt: string | null;
}
