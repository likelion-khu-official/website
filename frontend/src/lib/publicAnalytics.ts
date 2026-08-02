const PAGE_VIEW_ENDPOINT = '/api/analytics/pageviews';

/**
 * 페이지 이동을 사용자 흐름보다 우선하지 않는 best-effort 수집이다.
 * 서버가 운영 호스트·내부 경로·봇을 다시 검증하므로 클라이언트 판단만 신뢰하지 않는다.
 */
export function trackPageView(path: string) {
  const body = JSON.stringify({ path });
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

