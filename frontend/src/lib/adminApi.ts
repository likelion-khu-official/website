import type {
  AdminErrorCode,
  AdminLoginRequest,
  AdminLoginResponse,
  AdminRefreshResponse,
  AdminInvitationVerifyResponse,
  AdminInvitationAcceptRequest,
  AdminInvitationAcceptResponse,
  AdminPasswordForgotRequest,
  AdminPasswordForgotResponse,
  AdminPasswordResetVerifyResponse,
  AdminPasswordResetRequest,
  AdminPasswordResetResponse,
  AdminSummary,
  AdminInvitationCreateRequest,
  AdminInvitationSummary,
} from '@shared/types/admin';
import type { RecruitmentStatusResponse, RecruitmentStatusUpdateRequest } from '@shared/types/recruitment';
import type {
  MemberAdminSummary,
  MemberBulkCreateRequest,
  MemberBulkCreateResponse,
  MemberCreateRequest,
  MemberUpdateRequest,
} from '@shared/types/member';
import type { MemberPasswordResetResponse, MemberOffboardResponse } from '@shared/types/member-auth';
import type {
  ApplicationAdminSummary,
  ApplicationFormResponse,
  ApplicationFormSchema,
} from '@shared/types/application';
import type {
  AdminComment,
  CommentVisibilityRequest,
  SpringPage,
  PostSummary,
  PostStatus,
} from '@shared/types/feed';
import type { SubscriberSummary } from '@shared/types/recruitment';
import type {
  StaffAdminSummary,
  StaffCreateRequest,
  StaffImageUploadResponse,
  StaffUpdateRequest,
} from '@shared/types/staff';
import type { AuditLogQuery, AuditLogResponse } from '@shared/types/audit';
import type {
  AnalyticsPageViewQuery,
  AnalyticsPageViewResponse,
  BlogAnalyticsResponse,
  ProjectAnalyticsResponse,
  RecruitmentAnalyticsResponse,
} from '@shared/types/analytics';

/**
 * 모든 호출은 /api/admin/* 상대경로. access_token/refresh_token은 HttpOnly 쿠키라
 * JS에서 못 만지고, 같은 오리진 fetch면 브라우저가 알아서 실어 보낸다.
 */

export class AdminApiError extends Error {
  status: number;
  code: AdminErrorCode | null;
  constructor(message: string, status: number, code: AdminErrorCode | null = null) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

// ── 이용 현황 ──────────────────────────────────────────────────────

export function getAnalyticsPageViews(query: AnalyticsPageViewQuery) {
  const params = new URLSearchParams({
    from: query.from,
    to: query.to,
    interval: query.interval,
  });
  if (query.page) params.set('page', query.page);
  return request<AnalyticsPageViewResponse>(
    `/analytics/pageviews?${params.toString()}`,
    {},
    '이용 현황을 불러오지 못했어요.',
    true
  );
}

export function getBlogAnalytics(query: AnalyticsPageViewQuery) {
  const params = new URLSearchParams({
    from: query.from,
    to: query.to,
    interval: query.interval,
  });
  if (query.blogPostId) params.set('postId', String(query.blogPostId));
  return request<BlogAnalyticsResponse>(
    `/analytics/blog-posts?${params.toString()}`,
    {},
    '블로그 조회 현황을 불러오지 못했어요.',
    true
  );
}

export function getProjectAnalytics(query: AnalyticsPageViewQuery) {
  const params = new URLSearchParams({
    from: query.from,
    to: query.to,
    interval: query.interval,
  });
  if (query.projectId) params.set('projectId', String(query.projectId));
  return request<ProjectAnalyticsResponse>(
    `/analytics/projects?${params.toString()}`,
    {},
    '프로젝트 조회 현황을 불러오지 못했어요.',
    true
  );
}

export function getRecruitmentAnalytics() {
  return request<RecruitmentAnalyticsResponse>(
    '/analytics/recruitment',
    {},
    '지원 수를 불러오지 못했어요.',
    true
  );
}

async function throwApiError(res: Response, fallbackMessage: string): Promise<never> {
  let message = fallbackMessage;
  let code: AdminErrorCode | null = null;
  try {
    const data = await res.json();
    if (data?.message) message = data.message;
    if (data?.code) code = data.code;
  } catch {
    // 바디가 JSON이 아니면 기본 메시지를 쓴다
  }
  throw new AdminApiError(message, res.status, code);
}

let refreshInFlight: Promise<AdminRefreshResponse> | null = null;

/** 셸과 개별 화면이 동시에 세션을 확인해도 회전형 refresh token은 한 번만 사용한다. */
function refreshAccessToken(): Promise<boolean> {
  return refreshSession().then(
    () => true,
    () => false
  );
}

/**
 * @param retryOn401 access 토큰 만료(401) 시 refresh 후 한 번 재요청할지.
 *   로그인 자체나 초대/재설정 같은 비세션 흐름은 재시도 대상이 아니라 false로 둔다.
 */
async function request<T>(
  path: string,
  init: RequestInit,
  fallbackMessage: string,
  retryOn401: boolean
): Promise<T> {
  const isFormData = init.body instanceof FormData;
  const res = await fetch(`/api/admin${path}`, {
    ...init,
    headers: { ...(isFormData ? {} : { 'Content-Type': 'application/json' }), ...init.headers },
  });

  if (res.ok) {
    if (res.status === 204) return undefined as T;
    return res.json();
  }

  if (res.status === 401 && retryOn401) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      return request<T>(path, init, fallbackMessage, false);
    }
  }

  return throwApiError(res, fallbackMessage);
}

// ── 인증 ──────────────────────────────────────────────────────────

export function login(body: AdminLoginRequest) {
  return request<AdminLoginResponse>(
    '/auth/login',
    { method: 'POST', body: JSON.stringify(body) },
    '로그인에 실패했어요.',
    false
  );
}

export function logout() {
  return request<void>('/auth/logout', { method: 'POST' }, '로그아웃에 실패했어요.', false);
}

/** 현재 세션 확인 + access 토큰 갱신을 겸한다 (별도 "me" 엔드포인트가 없음) */
export function refreshSession(): Promise<AdminRefreshResponse> {
  if (!refreshInFlight) {
    refreshInFlight = request<AdminRefreshResponse>(
      '/auth/refresh',
      { method: 'POST' },
      '세션을 확인하지 못했어요.',
      false
    ).finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
}

// ── 초대 ──────────────────────────────────────────────────────────

export function verifyInvitation(token: string) {
  return request<AdminInvitationVerifyResponse>(
    `/invitations/${encodeURIComponent(token)}/verify`,
    {},
    '초대 링크를 확인하지 못했어요.',
    false
  );
}

export function acceptInvitation(token: string, body: AdminInvitationAcceptRequest) {
  return request<AdminInvitationAcceptResponse>(
    `/invitations/${encodeURIComponent(token)}/accept`,
    { method: 'POST', body: JSON.stringify(body) },
    '가입 처리에 실패했어요.',
    false
  );
}

export function createInvitation(body: AdminInvitationCreateRequest) {
  return request<AdminInvitationSummary>(
    '/invitations',
    { method: 'POST', body: JSON.stringify(body) },
    '초대에 실패했어요.',
    true
  );
}

export function listInvitations() {
  return request<AdminInvitationSummary[]>(
    '/invitations',
    {},
    '초대 목록을 불러오지 못했어요.',
    true
  );
}

export function cancelInvitation(id: number) {
  return request<void>(`/invitations/${id}`, { method: 'DELETE' }, '초대 취소에 실패했어요.', true);
}

// ── 비밀번호 재설정 ────────────────────────────────────────────────

export function forgotPassword(body: AdminPasswordForgotRequest) {
  return request<AdminPasswordForgotResponse>(
    '/password/forgot',
    { method: 'POST', body: JSON.stringify(body) },
    '요청을 처리하지 못했어요.',
    false
  );
}

export function verifyPasswordReset(token: string) {
  return request<AdminPasswordResetVerifyResponse>(
    `/password/reset/${encodeURIComponent(token)}/verify`,
    {},
    '재설정 링크를 확인하지 못했어요.',
    false
  );
}

export function resetPassword(token: string, body: AdminPasswordResetRequest) {
  return request<AdminPasswordResetResponse>(
    `/password/reset/${encodeURIComponent(token)}`,
    { method: 'POST', body: JSON.stringify(body) },
    '비밀번호 재설정에 실패했어요.',
    false
  );
}

// ── 운영진 관리 ────────────────────────────────────────────────────

export function listAdmins() {
  return request<AdminSummary[]>('/admins', {}, '운영진 목록을 불러오지 못했어요.', true);
}

export function deleteAdmin(id: number) {
  return request<void>(`/admins/${id}`, { method: 'DELETE' }, '삭제에 실패했어요.', true);
}

// ── 운영진 소개 관리 ─────────────────────────────────────────────

export function listStaff() {
  return request<StaffAdminSummary[]>('/staff', {}, '운영진 목록을 불러오지 못했어요.', true);
}

export function createStaff(body: StaffCreateRequest) {
  return request<StaffAdminSummary>(
    '/staff',
    { method: 'POST', body: JSON.stringify(body) },
    '운영진 등록에 실패했어요.',
    true
  );
}

export function updateStaff(id: number, body: StaffUpdateRequest) {
  return request<StaffAdminSummary>(
    `/staff/${id}`,
    { method: 'PATCH', body: JSON.stringify(body) },
    '운영진 수정에 실패했어요.',
    true
  );
}

export function deleteStaff(id: number) {
  return request<void>(`/staff/${id}`, { method: 'DELETE' }, '운영진 삭제에 실패했어요.', true);
}

export function uploadStaffImage(file: File) {
  const formData = new FormData();
  formData.append('file', file);
  return request<StaffImageUploadResponse>(
    '/staff/images',
    { method: 'POST', body: formData },
    '사진 업로드에 실패했어요.',
    true
  );
}

// ── 댓글 검열 ─────────────────────────────────────────────────────

export function listAdminComments() {
  return request<AdminComment[]>('/comments', {}, '댓글 목록을 불러오지 못했어요.', true);
}

export function updateCommentVisibility(id: number, body: CommentVisibilityRequest) {
  return request<AdminComment>(
    `/comments/${id}/visibility`,
    { method: 'PATCH', body: JSON.stringify(body) },
    body.hidden ? '댓글을 가리지 못했어요.' : '댓글을 다시 공개하지 못했어요.',
    true
  );
}

// ── 모집 관리 (#151) ──────────────────────────────────────────────

export function getRecruitmentStatus() {
  return request<RecruitmentStatusResponse>('/recruitment/status', {}, '모집 상태를 불러오지 못했어요.', true);
}

export function updateRecruitmentStatus(body: RecruitmentStatusUpdateRequest) {
  return request<RecruitmentStatusResponse>(
    '/recruitment/status',
    { method: 'PATCH', body: JSON.stringify(body) },
    '모집 상태 변경에 실패했어요.',
    true
  );
}

// ── 멤버 관리 (#145) ──────────────────────────────────────────────

export function listMembers() {
  return request<MemberAdminSummary[]>('/members', {}, '멤버 목록을 불러오지 못했어요.', true);
}

export function createMember(body: MemberCreateRequest) {
  return request<MemberAdminSummary>(
    '/members',
    { method: 'POST', body: JSON.stringify(body) },
    '등록에 실패했어요.',
    true
  );
}

export function createMembersBulk(members: MemberCreateRequest[]) {
  const body: MemberBulkCreateRequest = { members };
  return request<MemberBulkCreateResponse>(
    '/members/bulk',
    { method: 'POST', body: JSON.stringify(body) },
    '여러 명 등록에 실패했어요.',
    true
  );
}

export function updateMember(id: number, body: MemberUpdateRequest) {
  return request<MemberAdminSummary>(
    `/members/${id}`,
    { method: 'PATCH', body: JSON.stringify(body) },
    '수정에 실패했어요.',
    true
  );
}

export function resetMemberPassword(id: number) {
  return request<MemberPasswordResetResponse>(
    `/members/${id}/password/reset`,
    { method: 'POST' },
    '비밀번호 초기화에 실패했어요.',
    true
  );
}

export function offboardMember(id: number) {
  return request<MemberOffboardResponse>(
    `/members/${id}/offboard`,
    { method: 'POST' },
    '오프보딩에 실패했어요.',
    true
  );
}

// ── 지원폼 관리 (#152) ────────────────────────────────────────────

export function getApplicationForm() {
  return request<ApplicationFormResponse>(
    '/application-form',
    {},
    '지원서 양식을 불러오지 못했어요.',
    true
  );
}

export function updateApplicationForm(schema: ApplicationFormSchema) {
  return request<ApplicationFormResponse>(
    '/application-form',
    { method: 'PUT', body: JSON.stringify({ schema }) },
    '지원서 양식 저장에 실패했어요.',
    true
  );
}

export function listApplications() {
  return request<ApplicationAdminSummary[]>(
    '/applications',
    {},
    '지원자 목록을 불러오지 못했어요.',
    true
  );
}

// ── 모집 알림 구독자 명단 ─────────────────────────────────────────────

export function getSubscribers() {
  return request<SubscriberSummary[]>(
    '/recruitment/subscribers',
    {},
    '구독자 명단을 불러오지 못했어요.',
    true
  );
}

// ── 블로그 관리 (사후 숨김·재게시) ──────────────────────────────────

/** 전체 글 목록 — DRAFT·PUBLISHED·HIDDEN 모두. 공개 목록과 달리 상태로 필터하지 않는다. */
export function getAdminPosts(page = 0) {
  return request<SpringPage<PostSummary>>(
    `/posts?page=${page}`,
    {},
    '글 목록을 불러오지 못했어요.',
    true
  );
}

/** 상태 전이 — 게시(PUBLISHED)·숨김(HIDDEN). 되돌리기 가능. */
export function updatePostStatus(id: number, status: PostStatus) {
  return request<PostSummary>(
    `/posts/${id}/status`,
    { method: 'PATCH', body: JSON.stringify({ status }) },
    '상태 변경에 실패했어요.',
    true
  );
}

// ── 감사 로그 (#338) ──────────────────────────────────────────────

export function listAuditLogs(query: AuditLogQuery = {}) {
  const params = new URLSearchParams();
  if (query.actorType) params.set('actorType', query.actorType);
  if (query.action) params.set('action', query.action);
  if (query.eventType) params.set('eventType', query.eventType);
  if (query.targetType) params.set('targetType', query.targetType);
  if (query.targetId != null) params.set('targetId', String(query.targetId));
  if (query.outcome) params.set('outcome', query.outcome);
  if (query.view) params.set('view', query.view);
  if (query.from) params.set('from', query.from);
  if (query.to) params.set('to', query.to);
  if (query.q) params.set('q', query.q);
  if (query.page != null) params.set('page', String(query.page));
  if (query.size != null) params.set('size', String(query.size));
  const qs = params.toString();
  return request<AuditLogResponse>(
    `/audit-logs${qs ? `?${qs}` : ''}`,
    {},
    '감사 로그를 불러오지 못했어요.',
    true
  );
}
