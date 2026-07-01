// shared/types/notification.ts 와 동일하게 유지 (계약 변경 시 같이 수정)

/** POST /api/notifications/subscribe */
export interface NotificationSubscribeRequest {
  email: string;
}

export interface NotificationSubscribeResponse {
  success: boolean;
  message?: string;
}
