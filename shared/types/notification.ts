// 모집 알림 구독 계약 — FE↔BE 합의 파일
// 변경 시 양 팀 합의 필요 (shared/ 규칙)

/** POST /api/notifications/subscribe */
export interface NotificationSubscribeRequest {
  email: string;
  /** 개인정보 수집·이용 동의(#68). false면 서버가 구독을 거부한다(PRIVACY_CONSENT_REQUIRED). */
  privacyConsent: boolean;
  /**
   * 봇 함정 필드(honeypot, #69). 사람에게는 화면에서 숨겨져 늘 빈 값으로 전송된다.
   * 값이 차 있으면 자동 제출(봇)로 간주해 서버가 조용히 무시한다. 항상 빈 문자열로 보낼 것.
   */
  website?: string;
}

export interface NotificationSubscribeResponse {
  success: boolean;
  message?: string;
}
