import { useSyncExternalStore } from 'react';

// 모집 시작 알림을 이미 신청했는지를 브라우저에 기억한다.
// 서버 상태가 아니라 "이 브라우저에서 신청한 적 있음" 힌트일 뿐 — CTA 표시를 바꾸는 용도.
const KEY = 'mlsa:recruit-alert-subscribed';
const EVENT = 'mlsa:recruit-alert-subscribed';

export function markRecruitAlertSubscribed() {
  try {
    localStorage.setItem(KEY, '1');
  } catch {
    // 프라이버시 모드 등으로 localStorage 접근 불가 — 무시한다.
  }
  // 같은 탭에서는 storage 이벤트가 안 뜨므로 직접 알려 구독자가 갱신되게 한다.
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(EVENT));
  }
}

export function hasRecruitAlertSubscription(): boolean {
  try {
    return localStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
}

function subscribe(callback: () => void) {
  window.addEventListener('storage', callback); // 다른 탭에서의 변경
  window.addEventListener(EVENT, callback); // 같은 탭에서의 신청
  return () => {
    window.removeEventListener('storage', callback);
    window.removeEventListener(EVENT, callback);
  };
}

// 신청 여부를 구독한다. 클라이언트 전용 값이라 서버 스냅샷은 항상 false(하이드레이션 안전).
export function useRecruitAlertSubscription(): boolean {
  return useSyncExternalStore(subscribe, hasRecruitAlertSubscription, () => false);
}
