package likelion.khu.website.recruitment;

// 모집이 닫힘→열림으로 전이됐다는 신호만 담은 마커 이벤트 — 발송 대상 목록은 담지 않는다.
// RecruitmentOpenEmailEventListener가 처리 시점에 구독자 목록을 직접 조회하므로 페이로드가 필요 없다.
record RecruitmentOpenedEvent() {
}
