'use client';

import { useState } from 'react';
import type { DeployOutcome, DeployRecord } from '@shared/types/deploy-history';

export const OUTCOME_LABELS: Record<DeployOutcome, string> = {
  confirmed: '정상 배포',
  rolled_back: '자동 롤백',
  rollback_failed: '롤백 실패',
  manual_intervention_needed: '수동 개입 필요',
  migration_check_blocked: '마이그레이션 차단',
  build_failed: '빌드 실패',
  unknown: '알 수 없음',
};

type Severity = 'ok' | 'warn' | 'critical' | 'unknown';

// 배포는 실패해도 DB는 안전한 경우(warn)와, DB가 실제로 어긋난 경우(critical)는 위험도가
// 다르다 — 전자는 다음 배포로 그냥 다시 시도하면 되고, 후자는 데이터 정합성 문제라 RUNBOOK을
// 봐야 한다. outcome 하나로 이 둘을 가르되, DB 불일치 여부는 별도로 한 번 더 확인한다(아래
// severityOf).
const OUTCOME_SEVERITY: Record<DeployOutcome, Severity> = {
  confirmed: 'ok',
  rolled_back: 'warn',
  build_failed: 'warn',
  migration_check_blocked: 'warn',
  rollback_failed: 'critical',
  manual_intervention_needed: 'critical',
  unknown: 'unknown',
};

function inSync(record: DeployRecord): boolean {
  return record.expectedMigrationCount === record.actualMigrationCount;
}

function severityOf(record: DeployRecord): Severity {
  if (!inSync(record)) return 'critical';
  return OUTCOME_SEVERITY[record.outcome];
}

/**
 * "어느 job이 성공/실패했는지"(cd.yml의 job DAG)를 점으로 보여줬더니, 실제로 화면만 보고는
 * 점이 왜 여러 개인지·뭘 뜻하는지 알 수 없다는 피드백을 받았다(2026-08-06) — 과정을 그대로
 * 노출하는 건 이 화면을 보는 사람(당직·온콜)이 원하는 정보가 아니었다. 필요한 건 "지금 무슨
 * 상태고, 내가 뭘 해야 하는가" 하나뿐이다. 그래서 job 단위 상태 대신, cd.yml이 각 갈림길에서
 * 사람에게 실제로 남기는 안내문(rollback/manual-intervention job의 echo 메시지, RUNBOOK 참고)을
 * 그대로 옮겨 outcome 하나당 한 문장으로 압축했다. 정상 배포(+DB 일치)는 할 일이 없으므로 null.
 */
// rolled_back·rollback_failed·manual_intervention_needed는 셋 다 같은 트리거(deploy 헬스체크
// 또는 smoke-test 실패)에서 갈라진다 — build job이 이미 성공해야 deploy까지 온 것이므로
// "빌드 문제"는 항상 배제할 수 있다. 실제 원인은 배포 직후 헬스체크(`/actuator/health`)가
// 아예 안 뜨거나(마이그레이션 실행 자체 실패, 필수 env 누락, DB 연결 실패, 빈 초기화 예외),
// 헬스체크는 통과했는데 공개 API 스모크 테스트(`/api/members` 등 4종)가 실패(새 코드의 런타임
// 버그)한 경우로 나뉜다 — 어느 쪽인지는 기록에 안 남아 단정하지 않는다(cd.yml 참고).
const DEPLOY_FAILURE_CAUSE_HINT =
  '빌드는 성공했으니 빌드(컴파일) 문제는 아니에요 — 배포 직후 헬스체크가 아예 안 뜨거나(마이그레이션 실행 실패·필수 환경변수 누락·DB 연결 실패), 헬스체크는 통과했는데 공개 API 응답이 실패(새 코드의 런타임 버그)했을 가능성이 커요.';

function actionGuidance(record: DeployRecord): string | null {
  // CD가 그 배포에서 실제로 관찰한 신호(헬스체크 로그 분류, 어느 스모크테스트 경로가
  // 실패했는지)를 분류해뒀으면 그 구체적인 문장을 쓴다 — 없을 때만(이 필드가 생기기 전
  // 옛 기록 등) "A거나 B일 수 있어요" 식 일반론으로 물러난다.
  const cause = record.probableCause ?? DEPLOY_FAILURE_CAUSE_HINT;

  switch (record.outcome) {
    case 'confirmed':
      return inSync(record) ? null : 'DB가 어긋난 채로 배포가 확정됐어요 — RUNBOOK으로 직접 확인하세요.';
    case 'rolled_back':
      return `자동으로 이전 버전으로 복구됐어요. ${cause} 원인 고쳐서 다시 배포하면 돼요.`;
    case 'rollback_failed': {
      // 이전 버전은 이 배포 직전까지 정상 서비스 중이었다 — 그런데도 그 이미지로 되돌린 뒤에도
      // 헬스체크가 실패했다면, 코드 문제가 아니라 서버 자체(디스크·메모리·포트 충돌 등) 문제일
      // 가능성이 코드 롤백보다 크다. probableCause가 있으면 cd.yml이 이미 이 맥락(롤백 후에도)을
      // 포함해서 분류해둔 값이라 그대로 쓴다.
      const rollbackCause =
        record.probableCause ??
        '방금까지 정상 동작하던 이전 버전조차 다시 안 떴다는 뜻이라, 코드보다는 서버 자체 문제(디스크·메모리·포트 충돌 등)일 가능성이 커요.';
      return `자동 복구(이전 버전으로 되돌리기)도 실패했어요 — ${rollbackCause} 즉시 RUNBOOK 절차로 확인하세요.`;
    }
    case 'manual_intervention_needed':
      return `삭제·변경형 마이그레이션이 포함돼 자동 복구를 하지 않았어요. ${cause} 원인 고쳐서 재배포(fix-forward)부터 검토하고, 안 되면 RUNBOOK으로 수동 롤백하세요.`;
    case 'migration_check_blocked':
      return '이미 적용된 마이그레이션 파일이 삭제·수정된 것 같아요 — 그 파일부터 확인하세요.';
    case 'build_failed':
      return '빌드가 안 됐어요 — 로그를 보고 원인을 고친 뒤 다시 배포하면 돼요.';
    default:
      return '결과를 판정하지 못했어요 — CD 로그를 직접 확인하세요.';
  }
}

/** 이 레포는 저장 시각을 UTC로 남기고 화면엔 항상 KST로 바꿔 보여준다(KST 표시 버그 재발 방지). */
function kstParts(iso: string) {
  const parts = new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    weekday: 'short',
    hour12: false,
  }).formatToParts(new Date(iso));
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? '';
  return {
    dateKey: `${get('year')}-${get('month')}-${get('day')}`,
    dateLabel: `${get('month')}/${get('day')} (${get('weekday')})`,
    time: `${get('hour')}:${get('minute')}`,
  };
}

function relativeFromNow(iso: string, now: number): string {
  const diffMs = now - new Date(iso).getTime();
  const rtf = new Intl.RelativeTimeFormat('ko', { numeric: 'auto' });
  const diffMin = Math.round(diffMs / 60000);
  if (Math.abs(diffMin) < 1) return '방금';
  if (Math.abs(diffMin) < 60) return rtf.format(-diffMin, 'minute');
  const diffHour = Math.round(diffMin / 60);
  if (Math.abs(diffHour) < 24) return rtf.format(-diffHour, 'hour');
  const diffDay = Math.round(diffHour / 24);
  return rtf.format(-diffDay, 'day');
}

function toChronological(records: DeployRecord[]): DeployRecord[] {
  return records.slice().reverse();
}

interface Incident {
  startIndex: number; // chronological index, older
  endIndex: number; // chronological index, newer
}

/** 연속으로 DB 정합성이 깨진(critical) 구간을 하나로 묶는다 — "언제부터 언제까지 위험했나"를
 * 점선 두 칸이 아니라 문장으로 답하기 위해서다. */
function findIncidents(chronological: DeployRecord[]): Incident[] {
  const incidents: Incident[] = [];
  let start: number | null = null;
  chronological.forEach((record, index) => {
    const broken = !inSync(record);
    if (broken && start === null) start = index;
    if (!broken && start !== null) {
      incidents.push({ startIndex: start, endIndex: index - 1 });
      start = null;
    }
  });
  if (start !== null) incidents.push({ startIndex: start, endIndex: chronological.length - 1 });
  return incidents;
}

const SEVERITY_PILL: Record<Severity, string> = {
  ok: 'border-emerald-400/25 bg-emerald-400/10 text-emerald-200',
  warn: 'border-amber-300/25 bg-amber-300/10 text-amber-200',
  critical: 'border-red-400/30 bg-red-400/10 text-red-200',
  unknown: 'border-white/15 bg-white/5 text-muted',
};

const RAIL_COLOR: Record<Severity, string> = {
  ok: 'bg-emerald-400/70',
  warn: 'bg-amber-300/70',
  critical: 'bg-red-400',
  unknown: 'bg-white/20',
};

export default function DeployHistoryTimeline({ records }: { records: DeployRecord[] }) {
  const chronological = toChronological(records); // 과거 → 최신, 인덱스 계산용
  const newestFirst = records; // API 그대로 — 화면엔 최신이 위
  const incidents = findIncidents(chronological);
  // "지금"은 렌더 순수성 규칙상 렌더 본문에서 직접 못 읽는다(react-hooks/purity) — 마운트 시
  // 한 번만 고정해 상대 시각("3시간 전")의 기준으로 쓴다. 화면에 열려 있는 동안 아주 조금씩
  // 오차가 커질 수 있지만, 이 패널은 새로고침하지 않고 오래 띄워두는 화면이 아니라 무시 가능.
  const [now] = useState(() => Date.now());

  const incidentAt = (chronoIndex: number) => incidents.find((incident) => incident.startIndex === chronoIndex);

  // 날짜가 바뀌는 지점마다 헤더를 보여주기 위한 플래그를 미리 순수 계산해둔다(렌더 중 외부
  // 변수를 재할당하면 react-hooks/immutability에 걸린다).
  const showDateHeaderFlags = newestFirst.reduce<{ flags: boolean[]; lastKey: string }>(
    (acc, record) => {
      const { dateKey } = kstParts(record.timestamp);
      acc.flags.push(dateKey !== acc.lastKey);
      acc.lastKey = dateKey;
      return acc;
    },
    { flags: [], lastKey: '' }
  ).flags;

  return (
    <div>
      <div className="flex items-center justify-between px-1 pb-3 text-[11px] font-medium text-muted">
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden="true">↑</span> 최신 배포가 맨 위
        </span>
        <span className="inline-flex items-center gap-1.5">
          아래로 갈수록 과거 <span aria-hidden="true">↓</span>
        </span>
      </div>

      <ol className="relative flex flex-col">
        {newestFirst.map((record, displayIndex) => {
          const chronoIndex = chronological.length - 1 - displayIndex;
          const { dateLabel, time } = kstParts(record.timestamp);
          const showDateHeader = showDateHeaderFlags[displayIndex];
          const severity = severityOf(record);
          const guidance = actionGuidance(record);
          const synced = inSync(record);
          const incident = incidentAt(chronoIndex); // 이 기록이 어떤 사고의 "시작"(가장 과거)인가
          const destructiveFiles = record.migrations.filter((migration) => migration.type === 'destructive');

          return (
            <li key={`${record.timestamp}-${record.sha}`}>
              {showDateHeader ? (
                <div className="sticky top-0 z-10 -mx-1 bg-[#151516]/95 px-1 py-1.5 backdrop-blur">
                  <span className="text-[11px] font-semibold tracking-wide text-white/50">{dateLabel}</span>
                </div>
              ) : null}

              <div className="relative flex gap-3 py-2.5 pl-1">
                <span className={`absolute left-0 top-0 h-full w-[3px] rounded-full ${RAIL_COLOR[severity]}`} aria-hidden="true" />

                <div className="flex w-[120px] shrink-0 flex-col pl-3">
                  <span className="text-[13px] font-medium tabular-nums text-white/85">{time}</span>
                  <span className="text-[11px] tabular-nums text-muted">{relativeFromNow(record.timestamp, now)}</span>
                </div>

                <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="font-mono text-[12px] text-white/70">{record.sha.slice(0, 7)}</span>
                    <span className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold ${SEVERITY_PILL[severity]}`}>
                      {OUTCOME_LABELS[record.outcome]}
                    </span>
                    <span
                      className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold ${
                        synced ? 'border-white/12 bg-white/[0.03] text-muted' : 'border-red-400/30 bg-red-400/10 text-red-200'
                      }`}
                    >
                      {synced
                        ? `마이그레이션 ${record.actualMigrationCount}개 적용된 상태 · 앱과 일치`
                        : `마이그레이션 ${record.actualMigrationCount}/${record.expectedMigrationCount}개 적용된 상태 · DB가 앱보다 ${record.expectedMigrationCount - record.actualMigrationCount}개 뒤처짐`}
                    </span>
                    {record.latestAppliedMigration ? (
                      <span className="font-mono text-[11px] text-muted">{record.latestAppliedMigration}까지</span>
                    ) : null}
                    {destructiveFiles.length > 0 ? (
                      <span className="inline-flex rounded-full border border-amber-300/25 bg-amber-300/10 px-2 py-0.5 text-[11px] font-semibold text-amber-200">
                        삭제·변경형 마이그레이션 {destructiveFiles.length}개
                      </span>
                    ) : null}
                  </div>
                  {guidance ? (
                    <p className={`text-[12px] leading-5 ${severity === 'critical' ? 'text-red-200' : 'text-muted'}`}>{guidance}</p>
                  ) : null}
                </div>
              </div>

              {incident ? (
                <div className="mb-2 ml-4 rounded-lg border border-red-400/25 bg-red-400/[0.06] px-3 py-2 text-[12px] leading-5 text-red-100">
                  <strong className="text-red-200">정합성 사고</strong>
                  {' — '}
                  {(() => {
                    const startedAt = chronological[incident.startIndex].timestamp;
                    const endedRecord = chronological[incident.endIndex + 1]; // 정상화된 다음 배포(있으면)
                    const startLabel = kstParts(startedAt);
                    const durationMs = (endedRecord ? new Date(endedRecord.timestamp).getTime() : now) - new Date(startedAt).getTime();
                    const hours = Math.round(durationMs / 3_600_000);
                    const count = incident.endIndex - incident.startIndex + 1;
                    return endedRecord ? (
                      <>
                        {startLabel.dateLabel} {startLabel.time}부터 배포 {count}건, 약 {hours}시간 동안 DB가 뒤처진 채였고 {kstParts(endedRecord.timestamp).dateLabel} {kstParts(endedRecord.timestamp).time} 배포에서 정상화됨
                      </>
                    ) : (
                      <>{startLabel.dateLabel} {startLabel.time}부터 아직 정상화되지 않음 — 배포 {count}건째 계속 뒤처진 상태</>
                    );
                  })()}
                </div>
              ) : null}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

export { actionGuidance, severityOf, inSync, findIncidents, toChronological };
