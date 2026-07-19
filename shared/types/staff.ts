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
  sortOrder: number;
}

/** POST /api/admin/staff — 최고관리자 전용. 사진은 /api/feed/images로 먼저 업로드해 URL을 받는다 */
export interface StaffCreateRequest {
  name: string;
  position: string;
  department: string;
  admissionYear: number;
  photoUrl: string;
  introduction?: string;
  sortOrder: number;
}

/** PATCH /api/admin/staff/{id} — 최고관리자 전용. name·department·admissionYear는 등록 후 불변이라 DTO에 없음 */
export interface StaffUpdateRequest {
  position?: string;
  photoUrl?: string;
  introduction?: string;
  sortOrder?: number;
}