'use client';

import { useEffect, useState } from 'react';
import { getAlarmStatus } from '@/lib/adminApi';
import type { AlarmStatusItem, AlarmStatusSnapshot } from '@shared/types/alarm-status';

// 크론이 5분마다 도니 정상이어도 최대 5분 정도는 뜨는 시차가 있다. 그보다 훨씬 오래
// (3틱=15분) 못 들어왔으면 "값이 오래됐다"보다는 "크론 자체가 멈췄을 수 있다"는
// 신호로 보는 게 맞다 - 이 화면이 "지금 알람이 진짜 돌고 있는지"까지 답해야 해서 필요.
const STALE_AFTER_MS = 15 * 60 * 1000;

function formatKst(iso: string): string {
  const parts = new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(new Date(iso));
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? '';
  return `${get('month')}/${get('day')} ${get('hour')}:${get('minute')}`;
}

function AlarmRow({ alarm }: { alarm: AlarmStatusItem }) {
  const firing = alarm.status === 'FIRING';
  return (
    <li className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/20 p-4">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-white">{alarm.alarmName}</p>
        <p className="mt-0.5 text-xs text-muted">{alarm.severity === 'CRITICAL' ? '심각' : '경고'}</p>
      </div>
      <span
        className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${
          firing ? 'bg-red-500/20 text-red-300' : 'bg-emerald-500/15 text-emerald-300'
        }`}
      >
        {firing ? 'FIRING' : 'OK'}
      </span>
    </li>
  );
}

export default function AlarmStatusPanel() {
  const [snapshot, setSnapshot] = useState<AlarmStatusSnapshot | null | undefined>(undefined);
  const [stale, setStale] = useState(false);
  const [error, setError] = useState('');
  const [retryIndex, setRetryIndex] = useState(0);

  useEffect(() => {
    let cancelled = false;
    getAlarmStatus()
      .then((response) => {
        if (!cancelled) {
          // Date.now()는 렌더링 중이 아니라 이 콜백(응답이 온 시점) 한 번에서만 부른다 -
          // 렌더 함수 안에서 직접 부르면 리렌더마다 값이 계속 바뀌어 impure해진다.
          setStale(
            response ? Date.now() - new Date(response.timestamp).getTime() > STALE_AFTER_MS : false
          );
          setSnapshot(response ?? null);
          setError('');
        }
      })
      .catch((reason) => {
        if (!cancelled) setError(reason instanceof Error ? reason.message : '알람 상태를 불러오지 못했어요.');
      });
    return () => {
      cancelled = true;
    };
  }, [retryIndex]);

  const firingCount = snapshot?.alarms.filter((alarm) => alarm.status === 'FIRING').length ?? 0;

  return (
    <section className="mt-6 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04]" aria-labelledby="alarm-status-title">
      <div className="border-b border-white/10 p-5 sm:p-6">
        <p className="text-xs font-semibold tracking-[0.16em] text-muted">ALARM STATUS</p>
        <h2 id="alarm-status-title" className="mt-2 text-lg font-semibold text-white">알람 상태</h2>
        <p className="mt-1 text-sm text-muted">
          OCI Monitoring이 판정한 지금 상태를 5분마다 가져와요. 실제 알림은 여전히 OCI가 이메일로 보내요 — 여긴 조회만이에요.
        </p>
      </div>

      {error ? (
        <div className="p-6" role="alert">
          <p className="text-sm text-red-200">{error}</p>
          <button type="button" onClick={() => setRetryIndex((value) => value + 1)} className="mt-3 min-h-11 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm text-white outline-none focus-visible:ring-2 focus-visible:ring-accent">다시 불러오기</button>
        </div>
      ) : snapshot === undefined ? (
        <p className="p-6 text-sm text-muted" role="status">알람 상태를 불러오고 있어요…</p>
      ) : snapshot === null ? (
        <p className="p-6 text-sm text-muted">아직 기록된 알람 상태가 없어요.</p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 p-5 sm:p-6 sm:pb-0">
            <div className="rounded-xl border border-white/10 bg-black/20 p-4">
              <p className="text-xs text-muted">지금 FIRING 중</p>
              <p className={`mt-1 text-2xl font-semibold tabular-nums ${firingCount > 0 ? 'text-red-300' : 'text-white'}`}>{firingCount}개</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-black/20 p-4">
              <p className="text-xs text-muted">마지막 확인 (KST)</p>
              <p className={`mt-1 text-2xl font-semibold tabular-nums ${stale ? 'text-red-300' : 'text-white'}`}>{formatKst(snapshot.timestamp)}</p>
              {stale && <p className="mt-1 text-xs text-red-300">15분 넘게 갱신이 안 됐어요 — 크론이 멈췄을 수 있어요.</p>}
            </div>
          </div>
          <ul className="space-y-2 p-5 sm:p-6">
            {snapshot.alarms.map((alarm) => (
              <AlarmRow key={alarm.alarmName} alarm={alarm} />
            ))}
          </ul>
        </>
      )}
      <p className="border-t border-white/10 px-5 py-4 text-xs leading-5 text-muted">
        알람이 왜 울렸는지·대응 방법은 RUNBOOK을 참고해요 — 여기서 조치는 안 돼요.
      </p>
    </section>
  );
}
