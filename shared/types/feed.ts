// 피드(블로그) 계약 — FE↔BE 합의 파일
// 변경 시 양 팀 합의 필요 (shared/ 규칙)

// ── 공통 ──────────────────────────────────────────────────────────

/** Spring Page<T> 응답 래퍼 */
export interface SpringPage<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;   // 현재 페이지 (0-indexed)
  size: number;
  first: boolean;
  last: boolean;
  empty: boolean;
}

export type PostStatus = 'DRAFT' | 'PUBLISHED' | 'HIDDEN';

// ── 글 (Post) ─────────────────────────────────────────────────────

/** GET /api/posts — 공개 목록 카드용 */
export interface PostSummary {
  id: number;
  slug: string;
  title: string;
  summary: string | null;
  thumbnailUrl: string | null;
  authorName: string;
  authorPart: string | null; // 작성자 파트 (BE/FE/PM 등), 파트 없는 멤버는 null
  status: PostStatus;
  publishedAt: string | null; // ISO 8601
  createdAt: string;
}

/** GET /api/posts/{slug} — 개별 글 상세 */
export interface PostDetail extends PostSummary {
  content: string;
  updatedAt: string;
  commentCount: number;
}

/** POST /api/posts — 글 작성 요청 (인증: 멤버 로그인 쿠키, 작성자는 세션에서 자동 결정) */
export interface PostCreateRequest {
  title: string;
  summary?: string;
  content: string;
  thumbnailUrl?: string;
}

/** PATCH /api/admin/posts/{id}/status — 상태 전이 */
export interface PostStatusUpdateRequest {
  status: PostStatus;
}

// ── 댓글 (Comment) ────────────────────────────────────────────────

/** GET /api/posts/{postId}/comments */
export interface Comment {
  id: number;
  nickname: string | null;    // null이면 "익명" 표시
  content: string;
  createdAt: string;
}

/** POST /api/posts/{postId}/comments */
export interface CommentCreateRequest {
  nickname?: string;          // 선택, 최대 50자
  content: string;            // 필수, 최대 300자
}

/**
 * POST /api/feed/images — 피드 이미지 업로드
 * multipart/form-data, key="file". jpg·png·webp·gif만 허용, 최대 5MB.
 */
export interface FeedImageUploadResponse {
  url: string;
}
