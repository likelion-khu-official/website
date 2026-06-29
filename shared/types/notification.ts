// 모집 알림 구독 계약 — FE↔BE 합의 파일
// 변경 시 양 팀 합의 필요 (shared/ 규칙)

/** POST /api/notifications/subscribe */
export interface NotificationSubscribeRequest {
  email: string;
}

export interface NotificationSubscribeResponse {
  success: boolean;
  message?: string;
}
