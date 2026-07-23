// 모집 관리 계약 — FE↔BE 합의 파일 (#124)
// 변경 시 양 팀 합의 필요 (shared/ 규칙)

/** GET /api/admin/recruitment/status, PATCH /api/admin/recruitment/status 공용 — 관리자(ADMIN 이상) */
export interface RecruitmentStatusResponse {
  open: boolean;
  subscriberCount: number;
}

/**
 * PATCH /api/admin/recruitment/status
 * open:true — 닫힘→열림 전이일 때만 그 시점 구독자(notification.ts) 전원에게 안내 메일 1회 발송.
 * 이미 열려있으면 무동작(멱등, 재발송 없음). open:false는 언제나 무동작(닫기만).
 */
export interface RecruitmentStatusUpdateRequest {
  open: boolean;
}
