// shared/types/notification.ts 와 동일하게 유지 (계약 변경 시 같이 수정)

/** POST /api/notifications/subscribe */
export interface NotificationSubscribeRequest {
  email: string;
  /** 개인정보 수집·이용 동의(#68). false면 서버가 구독을 거부한다(PRIVACY_CONSENT_REQUIRED). */
  privacyConsent: boolean;
  /** 봇 함정(honeypot, #69). 화면에서 숨겨 늘 빈 값으로 전송, 값이 차 있으면 서버가 무시. */
  website?: string;
}

export interface NotificationSubscribeResponse {
  success: boolean;
  message?: string;
}
