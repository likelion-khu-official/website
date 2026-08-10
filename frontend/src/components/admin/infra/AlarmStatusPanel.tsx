'use client';

import { useEffect, useState } from 'react';
import { getAlarmStatus } from '@/lib/adminApi';
import type { AlarmStatusItem, AlarmStatusSnapshot } from '@shared/types/alarm-status';

// 크론이 5분마다 도니 정상이어도 최대 5분 정도는 뜨는 시차가 있다. 그보다 훨씬 오래
// (3틱=15분) 못 들어왔으면 "값이 오래됐다"보다는 "크론 자체가 멈췄을 수 있다"는
// 신호로 보는 게 맞다 - 이 화면이 "지금 알람이 진짜 돌고 있는지"까지 답해야 해서 필요.
const STALE_AFTER_MS = 15 * 60 * 1000;

// OCI 알람 표시 이름(infra/docs/observability.md "Alarm 목록")에 공통으로 들어가는 키워드로
// 매칭한다 - prod/stage, "[예방적 경고]" 같은 접두어가 붙어도 무관하게 잡히게. 이 화면을
// 처음 보는 사람이 "그래서 뭘 확인해야 하나"까지 한 번에 알 수 있게 하려고, DeployHistoryTimeline의
// actionGuidance와 같은 목적으로 만들었다 - 알람 목록에 새 항목이 추가되면 여기도 같이 늘릴 것.
const GUIDANCE_RULES: Array<{ keyword: string; guidance: string }> = [
  { keyword: '디스크', guidance: '디스크 사용률이 80%를 5분 넘게 유지 중이에요. 오래된 로그·백업부터 정리하세요.' },
  { keyword: '메모리', guidance: '메모리 사용률이 85%를 5분 넘게 유지 중이에요. 어느 컨테이너가 늘었는지 확인하세요.' },
  { keyword: '백업', guidance: '마지막 백업 성공 신호로부터 26시간이 지났어요. backup-db.sh가 정상 동작했는지 확인하세요.' },
  { keyword: 'git 드리프트', guidance: '서버 git 워킹트리가 origin과 8분 넘게 달라요. 직접 수정했거나 정리 안 된 파일이 남아있을 수 있어요.' },
  { keyword: '이메일 실패', guidance: '최근 5분 안에 이메일 발송 실패가 임계치를 넘었어요. SMTP 자격증명·발송 한도를 확인하세요.' },
  { keyword: 'ERROR 로그', guidance: '최근 5분 안에 백엔드 ERROR 로그가 찍혔어요. 로그를 확인하세요.' },
];

function guidanceFor(alarmName: string): string {
  const rule = GUIDANCE_RULES.find((candidate) => alarmName.includes(candidate.keyword));
  return rule?.guidance ?? 'RUNBOOK을 참고해 원인을 확인하세요.';
}

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

// FIRING인 CRITICAL부터 눈에 띄어야 하니 위로, 나머지는 심각도만 구분. OK는 어차피 아래
// "정상" 묶음으로 따로 빠지니 이 정렬 대상이 아니다(sortFiring에서만 씀).
function severityRank(severity: AlarmStatusItem['severity']): number {
  return severity === 'CRITICAL' ? 0 : 1;
}

function FiringCard({ alarm }: { alarm: AlarmStatusItem }) {
  const critical = alarm.severity === 'CRITICAL';
  return (
    <li
      className={`rounded-xl border p-4 ${
        critical ? 'border-red-400/30 bg-red-400/[0.08]' : 'border-amber-300/30 bg-amber-300/[0.08]'
      }`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold ${
            critical ? 'border-red-400/30 bg-red-400/10 text-red-200' : 'border-amber-300/30 bg-amber-300/10 text-amber-200'
          }`}
        >
          FIRING
        </span>
        <span className={`text-[11px] font-semibold ${critical ? 'text-red-200' : 'text-amber-200'}`}>
          {critical ? '심각' : '경고'}
        </span>
        <span className="text-sm font-medium text-white">{alarm.alarmName}</span>
      </div>
      <p className={`mt-1.5 text-[13px] leading-5 ${critical ? 'text-red-100' : 'text-amber-100'}`}>{guidanceFor(alarm.alarmName)}</p>
    </li>
  );
}

function OkRow({ alarm }: { alarm: AlarmStatusItem }) {
  return (
    <li className="flex items-center justify-between gap-3 px-1 py-1.5">
      <span className="truncate text-[13px] text-white/70">{alarm.alarmName}</span>
      <span className="shrink-0 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-300">OK</span>
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

  const firing = (snapshot?.alarms ?? [])
    .filter((alarm) => alarm.status === 'FIRING')
    .slice()
    .sort((a, b) => severityRank(a.severity) - severityRank(b.severity));
  const ok = (snapshot?.alarms ?? []).filter((alarm) => alarm.status === 'OK');

  return (
    <section className="mt-6 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04]" aria-labelledby="alarm-status-title">
      <div className="border-b border-white/10 p-5 sm:p-6">
        <p className="text-xs font-semibold tracking-[0.16em] text-muted">ALARM STATUS</p>
        <h2 id="alarm-status-title" className="mt-2 text-lg font-semibold text-white">알람 상태</h2>
        <p className="mt-1 text-sm text-muted">
          OCI Monitoring이 판정한 지금 상태를 5분마다 가져와요. 실제 알림은 여전히 OCI가 이메일로 보내요 — 여긴 조회만이에요.
        </p>
        <dl className="mt-3 grid gap-x-6 gap-y-1 text-xs text-muted sm:grid-cols-2">
          <div className="flex gap-1.5">
            <dt className="shrink-0 font-mono text-white/70">likelion-server</dt>
            <dd>이 알람들을 실행·측정하는 물리 서버 하나 — stage·prod를 같이 호스팅해요.</dd>
          </div>
          <div className="flex gap-1.5">
            <dt className="shrink-0 font-mono text-white/70">likelion-prod / -stage</dt>
            <dd>알람이 가리키는 환경 — 백업·이메일·ERROR 로그처럼 환경별로 값이 갈리는 알람에만 붙어요.</dd>
          </div>
        </dl>
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
              <p className={`mt-1 text-2xl font-semibold tabular-nums ${firing.length > 0 ? 'text-red-300' : 'text-white'}`}>{firing.length}개</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-black/20 p-4">
              <p className="text-xs text-muted">마지막 확인 (KST)</p>
              <p className={`mt-1 text-2xl font-semibold tabular-nums ${stale ? 'text-red-300' : 'text-white'}`}>{formatKst(snapshot.timestamp)}</p>
              {stale && <p className="mt-1 text-xs text-red-300">15분 넘게 갱신이 안 됐어요 — 크론이 멈췄을 수 있어요.</p>}
            </div>
          </div>

          <div className="p-5 sm:p-6">
            {firing.length > 0 ? (
              <ul className="space-y-2">
                {firing.map((alarm) => (
                  <FiringCard key={alarm.alarmName} alarm={alarm} />
                ))}
              </ul>
            ) : (
              <p className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.06] px-4 py-3 text-sm text-emerald-200">
                지금 FIRING 중인 알람이 없어요.
              </p>
            )}

            {ok.length > 0 && (
              <details className="mt-4 group">
                <summary className="cursor-pointer text-xs font-medium text-muted outline-none [&::-webkit-details-marker]:hidden">
                  정상 {ok.length}개 <span className="text-white/40 group-open:hidden">— 펼쳐서 보기</span>
                </summary>
                <ul className="mt-2 divide-y divide-white/5 rounded-xl border border-white/10 bg-black/10 px-3">
                  {ok.map((alarm) => (
                    <OkRow key={alarm.alarmName} alarm={alarm} />
                  ))}
                </ul>
              </details>
            )}
          </div>
        </>
      )}
      <p className="border-t border-white/10 px-5 py-4 text-xs leading-5 text-muted">
        알람이 왜 울렸는지·대응 방법은 RUNBOOK을 참고해요 — 여기서 조치는 안 돼요.
      </p>
    </section>
  );
}
