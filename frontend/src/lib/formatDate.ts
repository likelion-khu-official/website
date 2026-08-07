export function formatDate(iso: string): string {
  // 백엔드 JVM 기본 타임존이 UTC라(TZ 설정 없음) 타임존 없는 문자열은 KST가 아니라 UTC 벽시계 값이다
  // (AuditLogViewer의 formatKst()와 동일한 이유) — UTC로 파싱한 뒤 Asia/Seoul로 표시해야
  // UTC 15:00~23:59(=KST 00:00~08:59)에 생성된 데이터가 하루 이른 날짜로 안 보인다.
  const hasZone = /(?:Z|[+-]\d{2}:\d{2})$/.test(iso);
  const d = new Date(hasZone ? iso : `${iso}Z`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Asia/Seoul' });
}

/**
 * 활동 피드용 상대 시간 — 최근이면 "오늘/어제/N일 전/N주 전", 4주 이상 지나면 절대 날짜.
 * formatDate와 같은 방식으로 타임존 없는 문자열을 UTC로 파싱한다.
 */
export function formatRelativeTime(iso: string): string {
  const hasZone = /(?:Z|[+-]\d{2}:\d{2})$/.test(iso);
  const then = new Date(hasZone ? iso : `${iso}Z`);
  if (Number.isNaN(then.getTime())) return iso;

  const diffMs = Date.now() - then.getTime();
  const day = 24 * 60 * 60 * 1000;
  if (diffMs < day) return '오늘';

  const days = Math.floor(diffMs / day);
  if (days === 1) return '어제';
  if (days < 7) return `${days}일 전`;
  if (days < 28) return `${Math.floor(days / 7)}주 전`;
  return formatDate(iso);
}
