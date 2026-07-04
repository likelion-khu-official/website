// 피드(블로그) 계약 — FE↔BE 합의 파일
// 변경 시 양 팀 합의 필요 (shared/ 규칙)
// 이 파일은 매직링크 토큰 부분부터 채워짐 — 글(Post)·댓글(Comment) 계약은 별도로 추가될 예정

/** POST /api/feed/tokens — 매직링크 토큰 발급 */
export interface MagicLinkTokenIssueRequest {
  authorName: string;
}

export interface MagicLinkTokenIssueResponse {
  token: string;
  authorName: string;
  expiresAt: string; // ISO-8601
}

/** GET /api/feed/tokens/:token — 매직링크 토큰 상태 확인 (소모하지 않음) */
export interface MagicLinkTokenStatusResponse {
  authorName: string;
  valid: boolean;
  reason: "USED" | "EXPIRED" | null;
}
