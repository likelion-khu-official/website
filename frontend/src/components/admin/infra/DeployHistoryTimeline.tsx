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

type StageStatus = 'ok' | 'fail' | 'skip' | 'dim' | 'unknown';

interface Stage {
  label: string;
  status: StageStatus;
  note?: string;
}

/**
 * cd.yml의 job 그래프(config → migration-check → build → deploy → smoke-test →
 * confirm|rollback|manual-intervention → record-deploy-status)를 outcome 하나로부터 되짚는다.
 * record-deploy-status(cd.yml #476 이하)의 if/elif 판정이 각 job의 성공·실패·스킵 조합과 정확히
 * 1:1 대응해서, 저장된 outcome만으로 그 조합을 복원할 수 있다. 단 deploy·smoke-test 둘 중
 * 정확히 어느 쪽이 실패했는지는 기록에 안 남는다(rollback job의 조건이 `deploy.result==failure
 * OR smoke-test.result==failure`로 묶여 있어서) — 그래서 "배포·검증" 한 단계로 합쳐 보여준다.
 * 모르는 걸 아는 척하지 않는다.
 */
function deriveStages(record: DeployRecord): Stage[] {
  const destructive = record.migrations.some((migration) => migration.type === 'destructive');

  switch (record.outcome) {
    case 'confirmed':
      return [
        { label: '설정', status: 'ok' },
        { label: '마이그레이션 점검', status: 'ok', note: destructive ? '삭제·변경형 포함' : undefined },
        { label: '빌드', status: 'ok' },
        { label: '배포·검증', status: 'ok' },
        { label: '확정', status: 'ok' },
        { label: '기록', status: 'ok' },
      ];
    case 'rolled_back':
      return [
        { label: '설정', status: 'ok' },
        { label: '마이그레이션 점검', status: 'ok' },
        { label: '빌드', status: 'ok' },
        { label: '배포·검증', status: 'fail' },
        { label: '자동 롤백', status: 'ok' },
        { label: '기록', status: 'ok' },
      ];
    case 'rollback_failed':
      return [
        { label: '설정', status: 'ok' },
        { label: '마이그레이션 점검', status: 'ok' },
        { label: '빌드', status: 'ok' },
        { label: '배포·검증', status: 'fail' },
        { label: '자동 롤백', status: 'fail' },
        { label: '기록', status: 'ok' },
      ];
    case 'manual_intervention_needed':
      return [
        { label: '설정', status: 'ok' },
        { label: '마이그레이션 점검', status: 'ok', note: '삭제·변경형 포함 — 자동 롤백 생략' },
        { label: '빌드', status: 'ok' },
        { label: '배포·검증', status: 'fail' },
        { label: '수동 개입 필요', status: 'fail' },
        { label: '기록', status: 'ok' },
      ];
    case 'migration_check_blocked':
      return [
        { label: '설정', status: 'ok' },
        { label: '마이그레이션 점검', status: 'fail', note: '이미 적용된 파일이 삭제·수정됨' },
        { label: '빌드', status: 'dim', note: '됐지만 배포엔 안 쓰임' },
        { label: '배포·검증', status: 'skip' },
        { label: '사후처리', status: 'skip' },
        { label: '기록', status: 'ok' },
      ];
    case 'build_failed':
      return [
        { label: '설정', status: 'ok' },
        { label: '마이그레이션 점검', status: 'ok' },
        { label: '빌드', status: 'fail' },
        { label: '배포·검증', status: 'skip' },
        { label: '사후처리', status: 'skip' },
        { label: '기록', status: 'ok' },
      ];
    default:
      return [
        { label: '설정', status: 'unknown' },
        { label: '마이그레이션 점검', status: 'unknown' },
        { label: '빌드', status: 'unknown' },
        { label: '배포·검증', status: 'unknown' },
        { label: '판정 불가', status: 'unknown' },
        { label: '기록', status: 'ok' },
      ];
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

const STAGE_DOT: Record<StageStatus, string> = {
  ok: 'bg-emerald-400',
  fail: 'bg-red-400',
  skip: 'bg-white/15',
  dim: 'bg-emerald-400/30',
  unknown: 'bg-amber-300/60',
};

function StageStrip({ stages }: { stages: Stage[] }) {
  return (
    <div className="flex items-center gap-[3px]" role="img" aria-label={`파이프라인: ${stages.map((stage) => `${stage.label} ${stage.status === 'ok' ? '성공' : stage.status === 'fail' ? '실패' : stage.status === 'skip' ? '건너뜀' : stage.status === 'dim' ? '성공(미사용)' : '판정 불가'}`).join(' → ')}`}>
      {stages.map((stage, index) => (
        <div key={`${stage.label}-${index}`} className="group relative flex items-center">
          {index > 0 ? <span className="mr-[3px] h-px w-2 bg-white/12" /> : null}
          <span
            title={`${stage.label}${stage.note ? ` — ${stage.note}` : ''}`}
            className={`block h-2 w-2 shrink-0 rounded-full ${STAGE_DOT[stage.status]}`}
          />
        </div>
      ))}
    </div>
  );
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
          const stages = deriveStages(record);
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
                      {synced ? `DB 일치 · ${record.actualMigrationCount}` : `DB ${record.expectedMigrationCount - record.actualMigrationCount}개 뒤처짐 · ${record.actualMigrationCount}/${record.expectedMigrationCount}`}
                    </span>
                    {destructiveFiles.length > 0 ? (
                      <span className="inline-flex rounded-full border border-amber-300/25 bg-amber-300/10 px-2 py-0.5 text-[11px] font-semibold text-amber-200">
                        삭제·변경형 마이그레이션 {destructiveFiles.length}개
                      </span>
                    ) : null}
                  </div>
                  <StageStrip stages={stages} />
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

      <div className="mt-1 flex items-center gap-4 px-1 pt-2 text-[11px] text-muted">
        <span className="inline-flex items-center gap-1.5"><i className="inline-block h-2 w-2 rounded-full bg-emerald-400" />성공</span>
        <span className="inline-flex items-center gap-1.5"><i className="inline-block h-2 w-2 rounded-full bg-red-400" />실패</span>
        <span className="inline-flex items-center gap-1.5"><i className="inline-block h-2 w-2 rounded-full bg-white/15" />건너뜀</span>
        <span className="inline-flex items-center gap-1.5"><i className="inline-block h-2 w-2 rounded-full bg-amber-300/60" />판정 불가</span>
      </div>
    </div>
  );
}

export { deriveStages, severityOf, inSync, findIncidents, toChronological };
