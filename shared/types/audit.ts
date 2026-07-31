// 감사 로그 계약 — FE↔BE 합의 파일 (#338)
// 변경 시 양 팀 합의 필요 (shared/ 규칙)
//
// 감사 로그는 시스템에서 일어난 의미 있는 행위(상태변경·인증·민감 열람)를, 관리자조차 앱을 통해
// 수정·삭제할 수 없게 남긴 기록이다. 이 계약은 리뷰 표면(FE)이 그 기록을 읽어 오기 위한 형태다.

export type AuditActorType = 'ADMIN' | 'MEMBER' | 'ANONYMOUS' | 'SYSTEM';

export type AuditActionType =
  | 'STATE_CHANGE' // 데이터를 만들거나 바꾸거나 지운 행위
  | 'LOGIN_SUCCESS'
  | 'LOGIN_FAILURE'
  | 'LOGOUT'
  | 'SENSITIVE_READ'; // 지원자 개인정보 등 민감 정보 열람

export type AuditOutcome = 'SUCCESS' | 'FAILURE';

/** 감사 이벤트 한 건 */
export interface AuditLogEntry {
  id: number;
  actorType: AuditActorType;
  /** 익명·계정 못 찾은 실패 로그인은 null */
  actorId: number | null;
  /** 행위 시점의 로그인 식별자 스냅샷(어드민 이메일·멤버 학번). 개인정보 내용은 담지 않는다 */
  actorLabel: string | null;
  action: AuditActionType;
  /** 상태변경·열람은 HTTP 메서드+경로로 남는다. 인증 이벤트는 null일 수 있다 */
  httpMethod: string | null;
  path: string | null;
  outcome: AuditOutcome;
  statusCode: number | null;
  clientIp: string | null;
  occurredAt: string; // ISO-8601
}

/** GET /api/admin/audit-logs — 읽기 전용. ADMIN 전원 공람 */
export interface AuditLogResponse {
  entries: AuditLogEntry[];
  page: number;
  totalPages: number;
  totalCount: number;
}

/** 조회 필터 — 넘기지 않은 값은 서버가 무시한다 */
export interface AuditLogQuery {
  actorType?: AuditActorType;
  action?: AuditActionType;
  from?: string; // ISO-8601
  to?: string; // ISO-8601
  q?: string; // 행위자 라벨·경로 부분일치
  page?: number;
  size?: number;
}
