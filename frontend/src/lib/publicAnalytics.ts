const PAGE_VIEW_ENDPOINT = '/api/analytics/pageviews';
const EVENT_ENDPOINT = '/api/analytics/events';
const VISITOR_STORAGE_KEY = 'likelion-khu.analytics.visitor';
const VISIT_STORAGE_KEY = 'likelion-khu.analytics.visit';
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function getAnonymousVisitorId() {
  try {
    const existing = window.localStorage.getItem(VISITOR_STORAGE_KEY);
    if (existing && UUID_PATTERN.test(existing)) return existing;
    const visitorId = window.crypto.randomUUID();
    window.localStorage.setItem(VISITOR_STORAGE_KEY, visitorId);
    return visitorId;
  } catch {
    // 저장공간 차단·구형 브라우저에서는 조회수만 보내고 순 방문자 집계에서는 제외한다.
    return undefined;
  }
}

export function getAnonymousVisitId() {
  try {
    const existing = window.sessionStorage.getItem(VISIT_STORAGE_KEY);
    if (existing && UUID_PATTERN.test(existing)) return existing;
    const visitId = window.crypto.randomUUID();
    window.sessionStorage.setItem(VISIT_STORAGE_KEY, visitId);
    return visitId;
  } catch {
    return undefined;
  }
}

export type LandingSectionKey = 'PROJECT' | 'STAFF' | 'BLOG' | 'RECRUIT';
export type KeyClickKey =
  | 'APPLY_LANDING_RECRUIT'
  | 'APPLY_APPLICATION_FORM'
  | 'NOTIFICATION_LANDING_RECRUIT'
  | 'NOTIFICATION_APPLICATION_CLOSED'
  | 'BLOG_MORE_LANDING_BLOG'
  | 'PROJECT_MORE_LANDING_PROJECT'
  | 'PROJECT_GITHUB_PROJECT_DETAIL';

function trackEvent(event: 'SECTION_REACH' | 'KEY_CLICK', key: LandingSectionKey | KeyClickKey) {
  const visitId = getAnonymousVisitId();
  if (!visitId) return;
  const body = JSON.stringify({
    event,
    key,
    visitorId: getAnonymousVisitorId(),
    visitId,
  });
  const blob = new Blob([body], { type: 'application/json' });
  if (typeof navigator.sendBeacon === 'function' && navigator.sendBeacon(EVENT_ENDPOINT, blob)) return;
  void fetch(EVENT_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    keepalive: true,
  }).catch(() => {});
}

export function trackSectionReach(key: LandingSectionKey) {
  trackEvent('SECTION_REACH', key);
}

export function trackKeyClick(key: KeyClickKey) {
  trackEvent('KEY_CLICK', key);
}

/**
 * 페이지 이동을 사용자 흐름보다 우선하지 않는 best-effort 수집이다.
 * 서버가 운영 호스트·내부 경로·봇을 다시 검증하므로 클라이언트 판단만 신뢰하지 않는다.
 */
export function trackPageView(path: string) {
  const body = JSON.stringify({ path, visitorId: getAnonymousVisitorId() });
  const blob = new Blob([body], { type: 'application/json' });

  if (typeof navigator.sendBeacon === 'function' && navigator.sendBeacon(PAGE_VIEW_ENDPOINT, blob)) {
    return;
  }

  void fetch(PAGE_VIEW_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    keepalive: true,
  }).catch(() => {
    // 분석 실패는 방문자의 페이지 이용을 막지 않는다.
  });
}
