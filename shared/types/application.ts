// 지원폼 계약 — FE↔BE 합의 파일 (#152)
// 변경 시 양 팀 합의 필요 (shared/ 규칙)
//
// 핵심 아키텍처: FE가 질문을 아래 스키마(자체 문법)로 정의하고, BE는 그 스키마를
// 파싱하지 않고 JSON 한 덩어리로 그대로 저장한다. 지원자가 제출하면 그 시점의 폼
// 스키마를 답변과 함께 스냅샷으로 저장한다 — 다음 기수에 질문이 바뀌어도 과거 답변을
// 그때의 질문 정의로 해석할 수 있게 하기 위해서다.

/** 지원 세션 — 1·2지망 선택지이자, 세션별 조건부 질문의 분기 키 */
export type ApplicationTrack = 'FE' | 'BE' | 'DESIGN' | 'AI';

/** 질문 입력 타입 */
export type ApplicationQuestionType =
  | 'short_text' // 한 줄 (이름·학번·학과 등)
  | 'long_text' // 여러 줄 (지원 동기)
  | 'email'
  | 'phone'
  | 'url' // 포트폴리오·작업물 링크
  | 'select' // 단일 선택 — options 필요
  | 'track'; // 지원 세션(FE/BE/DESIGN/AI) 선택. 세션별 조건부 질문의 기준이 된다.

/** 질문 하나의 정의 */
export interface ApplicationQuestion {
  /** 답변 JSON의 키 — 한 폼 안에서 유일해야 한다 */
  id: string;
  label: string;
  type: ApplicationQuestionType;
  required: boolean;
  /** select 타입일 때의 선택지 */
  options?: string[];
  /**
   * 특정 세션 1지망일 때만 노출되는 조건부(세션별) 질문임을 뜻한다. 비어 있으면 공통(항상 노출).
   * 분기 기준은 폼에서 "첫 번째 track 타입 질문"(= 1지망)의 답이다.
   */
  showForTrack?: ApplicationTrack;
}

/** 폼 정의 전체 — 운영진이 관리자 화면에서 편집하는 대상 */
export interface ApplicationFormSchema {
  /** 이번 기수 안내(선택) */
  title?: string;
  description?: string;
  questions: ApplicationQuestion[];
}

// ── 공개 (비로그인 방문자) ──────────────────────────────────

/** GET /api/application-form — 현재 활성 폼 정의(모집 열림/닫힘과 무관하게 정의 자체는 반환) */
export interface ApplicationFormResponse {
  schema: ApplicationFormSchema;
}

/** POST /api/applications — 지원 제출 (모집이 열려 있을 때만 접수) */
export interface ApplicationSubmitRequest {
  /** 질문 id → 답변. 단일 값이라 문자열(track·select도 선택된 값 문자열). */
  answers: Record<string, string>;
  /** [필수] 개인정보 수집·이용 동의 — false면 서버가 접수 거부 */
  privacyConsent: boolean;
}

export interface ApplicationSubmitResponse {
  success: boolean;
  message?: string;
}

// ── 관리자 (ADMIN 이상) ─────────────────────────────────────

/** GET /api/admin/application-form, PUT /api/admin/application-form — 폼 정의 조회·편집 */
export interface ApplicationFormUpdateRequest {
  schema: ApplicationFormSchema;
}

/**
 * GET /api/admin/applications — 지원자 목록.
 * 답변(answers)을 제출 시점 스냅샷 스키마(schema)로 해석해 라벨과 함께 보여준다.
 */
export interface ApplicationAdminSummary {
  id: number;
  submittedAt: string;
  schema: ApplicationFormSchema;
  answers: Record<string, string>;
}
