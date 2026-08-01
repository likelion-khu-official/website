'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { refreshSession, listAuditLogs, AdminApiError } from '@/lib/adminApi';
import type {
  AuditActionType,
  AuditActorType,
  AuditEventType,
  AuditLogEntry,
  AuditLogQuery,
  AuditOutcome,
  AuditView,
} from '@shared/types/audit';

const ACTOR_LABELS: Record<AuditActorType, string> = {
  ADMIN: '관리자',
  MEMBER: '부원',
  ANONYMOUS: '익명',
  SYSTEM: '시스템',
};

const ACTION_LABELS: Record<AuditActionType, string> = {
  STATE_CHANGE: '데이터 변경',
  LOGIN_SUCCESS: '로그인 성공',
  LOGIN_FAILURE: '로그인 실패',
  LOGOUT: '로그아웃',
  SENSITIVE_READ: '민감정보 열람',
};

const EVENT_TYPE_INFO: Record<AuditEventType, { label: string; description: string }> = {
  AUTHENTICATION: { label: '인증', description: '관리자·부원의 로그인 성공, 실패, 로그아웃' },
  PEOPLE_MANAGEMENT: { label: '사람·권한', description: '멤버, 운영진, 관리자 계정과 초대 변경' },
  CONTENT_MANAGEMENT: { label: '콘텐츠', description: '블로그, 댓글, 프로젝트의 생성·수정·상태 변경' },
  RECRUITMENT_MANAGEMENT: { label: '모집', description: '모집 시작과 종료' },
  APPLICATION_MANAGEMENT: { label: '지원 설정', description: '지원서 양식 변경' },
  SENSITIVE_ACCESS: { label: '민감정보 접근', description: '지원자 개인정보처럼 보호가 필요한 정보 열람' },
  AUDIT_REVIEW: { label: '감사 검토', description: '감사로그 화면 열람' },
  OTHER: { label: '기타', description: '기존 분류에 속하지 않는 시스템 상태 변경' },
};

const TARGET_LABELS: Record<string, string> = {
  ADMIN: '관리자',
  ADMIN_INVITATION: '관리자 초대',
  MEMBER: '멤버',
  STAFF: '운영진',
  POST: '블로그 글',
  COMMENT: '댓글',
  PROJECT: '프로젝트',
  RECRUITMENT: '모집',
  APPLICATION_FORM: '지원서 양식',
};

const ACTOR_TYPES = Object.keys(ACTOR_LABELS) as AuditActorType[];
const ACTION_TYPES = Object.keys(ACTION_LABELS) as AuditActionType[];
const EVENT_TYPES = Object.keys(EVENT_TYPE_INFO) as AuditEventType[];
const TARGET_TYPES = Object.keys(TARGET_LABELS);
const OUTCOMES: AuditOutcome[] = ['SUCCESS', 'FAILURE'];
const PAGE_SIZE = 50;

type Filters = {
  view: AuditView;
  actorType: AuditActorType | '';
  action: AuditActionType | '';
  eventType: AuditEventType | '';
  targetType: string;
  targetId: string;
  outcome: AuditOutcome | '';
  from: string;
  to: string;
  q: string;
};

const DEFAULT_FILTERS: Filters = {
  view: 'IMPORTANT',
  actorType: '',
  action: '',
  eventType: '',
  targetType: '',
  targetId: '',
  outcome: '',
  from: '',
  to: '',
  q: '',
};

type QuickView = 'IMPORTANT' | 'ALL' | 'LOGIN_FAILURE' | 'SENSITIVE_READ';

const QUICK_VIEWS: { key: QuickView; label: string; hint: string }[] = [
  { key: 'IMPORTANT', label: '주요 활동', hint: '반복되는 감사 검토 기록 제외' },
  { key: 'ALL', label: '전체', hint: '숨김 없이 모든 기록' },
  { key: 'LOGIN_FAILURE', label: '로그인 실패', hint: '실패한 로그인 시도' },
  { key: 'SENSITIVE_READ', label: '민감 열람', hint: '보호 정보 접근 기록' },
];

function enumValue<T extends string>(value: string | null, values: T[]): T | '' {
  return value && values.includes(value as T) ? (value as T) : '';
}

function readFilters(params: { get(name: string): string | null }): Filters {
  const targetType = enumValue(params.get('targetType'), TARGET_TYPES);
  const targetId = params.get('targetId') ?? '';
  const from = params.get('from') ?? '';
  const to = params.get('to') ?? '';
  return {
    view: params.get('view') === 'ALL' ? 'ALL' : 'IMPORTANT',
    actorType: enumValue(params.get('actorType'), ACTOR_TYPES),
    action: enumValue(params.get('action'), ACTION_TYPES),
    eventType: enumValue(params.get('eventType'), EVENT_TYPES),
    targetType,
    targetId: targetType && /^\d+$/.test(targetId) ? targetId : '',
    outcome: enumValue(params.get('outcome'), OUTCOMES),
    from: /^\d{4}-\d{2}-\d{2}$/.test(from) ? from : '',
    to: /^\d{4}-\d{2}-\d{2}$/.test(to) ? to : '',
    q: params.get('q') ?? '',
  };
}

function readPage(params: { get(name: string): string | null }): number {
  const page = Number(params.get('page'));
  return Number.isInteger(page) && page >= 0 ? page : 0;
}

function toApiQuery(filters: Filters, page: number): AuditLogQuery {
  return {
    view: filters.view,
    actorType: filters.actorType || undefined,
    action: filters.action || undefined,
    eventType: filters.eventType || undefined,
    targetType: filters.targetType || undefined,
    targetId: filters.targetId ? Number(filters.targetId) : undefined,
    outcome: filters.outcome || undefined,
    from: filters.from ? `${filters.from}T00:00:00` : undefined,
    to: filters.to ? `${filters.to}T23:59:59` : undefined,
    q: filters.q || undefined,
    page,
    size: PAGE_SIZE,
  };
}

function filterUrl(filters: Filters, page: number): string {
  const params = new URLSearchParams();
  params.set('view', filters.view);
  if (filters.actorType) params.set('actorType', filters.actorType);
  if (filters.action) params.set('action', filters.action);
  if (filters.eventType) params.set('eventType', filters.eventType);
  if (filters.targetType) params.set('targetType', filters.targetType);
  if (filters.targetId) params.set('targetId', filters.targetId);
  if (filters.outcome) params.set('outcome', filters.outcome);
  if (filters.from) params.set('from', filters.from);
  if (filters.to) params.set('to', filters.to);
  if (filters.q) params.set('q', filters.q);
  if (page > 0) params.set('page', String(page));
  return `/admin/audit-logs?${params.toString()}`;
}

function describe(entry: AuditLogEntry): string {
  if (entry.summary) return entry.summary;
  if (entry.action === 'SENSITIVE_READ' && entry.path?.includes('/applications')) return '지원자 명단 열람';
  if (entry.action === 'SENSITIVE_READ' && entry.path?.includes('/audit-logs')) return '감사로그 열람';
  return ACTION_LABELS[entry.action];
}

function formatKst(iso: string): string {
  const hasZone = /(?:Z|[+-]\d{2}:\d{2})$/.test(iso);
  const date = new Date(hasZone ? iso : `${iso}+09:00`);
  if (Number.isNaN(date.getTime())) return iso;
  const parts = new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value ?? '';
  return `${part('year')}-${part('month')}-${part('day')} ${part('hour')}:${part('minute')}:${part('second')} KST`;
}

function actorText(entry: AuditLogEntry): string {
  const identity = entry.actorLabel ?? (entry.actorId != null ? `#${entry.actorId}` : '식별 정보 없음');
  return `${ACTOR_LABELS[entry.actorType]} · ${identity}`;
}

function targetText(entry: AuditLogEntry): string {
  if (!entry.targetType) return '대상 없음';
  const label = TARGET_LABELS[entry.targetType] ?? entry.targetType;
  return entry.targetId != null ? `${label} #${entry.targetId}` : label;
}

function quickFilters(key: QuickView): Filters {
  if (key === 'ALL') return { ...DEFAULT_FILTERS, view: 'ALL' };
  if (key === 'LOGIN_FAILURE') return { ...DEFAULT_FILTERS, view: 'ALL', action: 'LOGIN_FAILURE' };
  if (key === 'SENSITIVE_READ') return { ...DEFAULT_FILTERS, view: 'ALL', action: 'SENSITIVE_READ' };
  return { ...DEFAULT_FILTERS };
}

function activeQuickView(filters: Filters): QuickView | null {
  const withoutPreset =
    !filters.actorType &&
    !filters.eventType &&
    !filters.targetType &&
    !filters.targetId &&
    !filters.outcome &&
    !filters.from &&
    !filters.to &&
    !filters.q;
  if (!withoutPreset) return null;
  if (filters.action === 'LOGIN_FAILURE' && filters.view === 'ALL') return 'LOGIN_FAILURE';
  if (filters.action === 'SENSITIVE_READ' && filters.view === 'ALL') return 'SENSITIVE_READ';
  if (!filters.action && filters.view === 'ALL') return 'ALL';
  if (!filters.action && filters.view === 'IMPORTANT') return 'IMPORTANT';
  return null;
}

type ChangeLine = { label: string; before?: string; after?: string; value?: string };

function parseChanges(detail: string): ChangeLine[] {
  return detail.split('\n').filter(Boolean).map((line) => {
    const colon = line.indexOf(': ');
    if (colon >= 0) {
      const label = line.slice(0, colon);
      const value = line.slice(colon + 2);
      const arrow = value.indexOf(' → ');
      if (arrow >= 0) {
        return { label, before: value.slice(0, arrow), after: value.slice(arrow + 3) };
      }
      return { label, value };
    }
    if (line.endsWith(' 변경됨')) {
      return { label: line.slice(0, -4), value: '변경됨 · 값은 보호를 위해 기록하지 않음' };
    }
    return { label: '변경', value: line };
  });
}

const inputClass =
  'min-h-10 w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 text-sm text-white outline-none transition-colors placeholder:text-white/30 focus:border-white/30';

export default function AuditLogViewer() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [draft, setDraft] = useState<Filters>(() => readFilters(searchParams));
  const [applied, setApplied] = useState<Filters>(() => readFilters(searchParams));
  const [targetPage, setTargetPage] = useState(() => readPage(searchParams));
  const [entries, setEntries] = useState<AuditLogEntry[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [showGuide, setShowGuide] = useState(false);
  const [reloadIndex, setReloadIndex] = useState(0);
  const requestKey = useRef('');

  const selectedEntry = entries.find((entry) => entry.id === selectedId) ?? null;
  const quickView = activeQuickView(applied);

  useEffect(() => {
    const key = JSON.stringify([applied, targetPage, reloadIndex]);
    if (requestKey.current === key) return;
    requestKey.current = key;
    (async () => {
      setLoading(true);
      setLoadError('');
      try {
        await refreshSession();
        const response = await listAuditLogs(toApiQuery(applied, targetPage));
        if (requestKey.current !== key) return;
        setEntries(response.entries);
        setPage(response.page);
        setTotalPages(response.totalPages);
        setTotalCount(response.totalCount);
        setSelectedId((current) => response.entries.some((entry) => entry.id === current) ? current : null);
      } catch (error) {
        if (requestKey.current !== key) return;
        if (error instanceof AdminApiError && error.status === 401) {
          router.replace('/admin/login');
          return;
        }
        setLoadError(error instanceof AdminApiError ? error.message : '감사로그를 불러오지 못했어요.');
      } finally {
        if (requestKey.current === key) setLoading(false);
      }
    })();
  }, [applied, reloadIndex, router, targetPage]);

  useEffect(() => {
    if (!showGuide && selectedId === null) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (showGuide) setShowGuide(false);
      else setSelectedId(null);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [selectedId, showGuide]);

  function apply(next: Filters, nextPage = 0) {
    const targetType = next.targetType.trim().toUpperCase();
    const normalized = {
      ...next,
      targetType,
      targetId: targetType ? next.targetId.trim() : '',
      q: next.q.trim(),
    };
    setDraft(normalized);
    setApplied(normalized);
    setTargetPage(nextPage);
    setSelectedId(null);
    router.replace(filterUrl(normalized, nextPage), { scroll: false });
  }

  function submitFilters(event: FormEvent) {
    event.preventDefault();
    apply(draft);
  }

  function changePage(nextPage: number) {
    setTargetPage(nextPage);
    setSelectedId(null);
    router.replace(filterUrl(applied, nextPage), { scroll: false });
  }

  function showTargetHistory(entry: AuditLogEntry) {
    if (!entry.targetType) return;
    apply({
      ...DEFAULT_FILTERS,
      view: 'ALL',
      targetType: entry.targetType,
      targetId: entry.targetId != null ? String(entry.targetId) : '',
    });
  }

  return (
    <div className="mx-auto max-w-[1500px]">
      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">감사로그</h1>
          <p className="mt-1 max-w-3xl text-sm leading-relaxed text-muted">
            운영 사건을 읽기 전용으로 조사합니다. 시간은 한국 표준시(KST)이며, 이 화면의 열람도 기록됩니다.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setShowGuide(true)}
            className="rounded-full border border-white/20 px-4 py-2 text-sm text-white transition-colors hover:bg-white/10"
          >
            기록 범위
          </button>
          <button type="button" onClick={() => router.push('/admin')} className="text-sm text-muted hover:text-white">
            ← 대시보드
          </button>
        </div>
      </header>

      <nav aria-label="감사로그 빠른 보기" className="mb-4 grid grid-cols-2 gap-2 md:flex">
        {QUICK_VIEWS.map((item) => {
          const active = quickView === item.key;
          return (
            <button
              key={item.key}
              type="button"
              aria-current={active ? 'page' : undefined}
              onClick={() => apply(quickFilters(item.key))}
              className={`rounded-xl border px-3 py-2 text-left transition-colors md:min-w-36 ${
                active ? 'border-white/40 bg-white text-black' : 'border-white/10 bg-white/[0.03] text-white hover:bg-white/[0.08]'
              }`}
            >
              <span className="block text-sm font-semibold">{item.label}</span>
              <span className={`mt-0.5 block text-[11px] ${active ? 'text-black/60' : 'text-white/40'}`}>{item.hint}</span>
            </button>
          );
        })}
      </nav>

      <form onSubmit={submitFilters} className="mb-5 rounded-2xl border border-white/10 bg-white/[0.025] p-4">
        <div className="flex flex-col gap-2 sm:flex-row">
          <label className="min-w-0 flex-1">
            <span className="sr-only">감사로그 검색</span>
            <input
              value={draft.q}
              onChange={(event) => setDraft((current) => ({ ...current, q: event.target.value }))}
              placeholder="행위자, 요약, 요청 경로, 대상 검색"
              className={inputClass}
            />
          </label>
          <button type="submit" className="min-h-10 rounded-lg bg-white px-5 text-sm font-semibold text-black hover:bg-white/90">
            조회
          </button>
          <button
            type="button"
            onClick={() => apply(DEFAULT_FILTERS)}
            className="min-h-10 rounded-lg border border-white/15 px-4 text-sm text-white/70 hover:bg-white/[0.06] hover:text-white"
          >
            초기화
          </button>
        </div>

        <details className="mt-3" open={Boolean(draft.actorType || draft.action || draft.eventType || draft.targetType || draft.targetId || draft.outcome || draft.from || draft.to)}>
          <summary className="cursor-pointer select-none text-sm text-white/60 hover:text-white">상세 필터</summary>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <FilterSelect
              label="행위자 유형"
              value={draft.actorType}
              onChange={(value) => setDraft((current) => ({ ...current, actorType: value as AuditActorType | '' }))}
            >
              <option value="">모든 행위자</option>
              {ACTOR_TYPES.map((type) => <option key={type} value={type}>{ACTOR_LABELS[type]}</option>)}
            </FilterSelect>
            <FilterSelect
              label="업무 영역"
              value={draft.eventType}
              onChange={(value) => setDraft((current) => ({ ...current, eventType: value as AuditEventType | '' }))}
            >
              <option value="">모든 영역</option>
              {EVENT_TYPES.map((type) => <option key={type} value={type}>{EVENT_TYPE_INFO[type].label}</option>)}
            </FilterSelect>
            <FilterSelect
              label="행위"
              value={draft.action}
              onChange={(value) => setDraft((current) => ({ ...current, action: value as AuditActionType | '' }))}
            >
              <option value="">모든 행위</option>
              {ACTION_TYPES.map((type) => <option key={type} value={type}>{ACTION_LABELS[type]}</option>)}
            </FilterSelect>
            <FilterSelect
              label="결과"
              value={draft.outcome}
              onChange={(value) => setDraft((current) => ({ ...current, outcome: value as AuditOutcome | '' }))}
            >
              <option value="">성공·실패 전체</option>
              <option value="SUCCESS">성공</option>
              <option value="FAILURE">실패</option>
            </FilterSelect>
            <FilterInput label="시작일" type="date" max={draft.to || undefined} value={draft.from} onChange={(value) => setDraft((current) => ({ ...current, from: value }))} />
            <FilterInput label="종료일" type="date" min={draft.from || undefined} value={draft.to} onChange={(value) => setDraft((current) => ({ ...current, to: value }))} />
            <FilterSelect label="대상" value={draft.targetType} onChange={(value) => setDraft((current) => ({ ...current, targetType: value, targetId: value === current.targetType ? current.targetId : '' }))}>
              <option value="">모든 대상</option>
              {TARGET_TYPES.map((type) => <option key={type} value={type}>{TARGET_LABELS[type]}</option>)}
            </FilterSelect>
            <FilterInput label="대상 ID" inputMode="numeric" pattern="[0-9]*" disabled={!draft.targetType} value={draft.targetId} placeholder={draft.targetType ? '숫자 ID' : '대상을 먼저 선택'} onChange={(value) => setDraft((current) => ({ ...current, targetId: value.replace(/\D/g, '') }))} />
          </div>
        </details>
      </form>

      <div className={selectedEntry ? 'grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_420px]' : ''}>
        <section aria-label="감사로그 목록" className="min-w-0">
          <div className="mb-2 flex items-center justify-between gap-3">
            <p className="text-xs text-muted">조회 결과 {totalCount.toLocaleString()}건</p>
            <p className="text-xs text-white/35">최신순 · KST</p>
          </div>

          {loading ? (
            <div role="status" className="rounded-2xl border border-white/10 py-24 text-center text-sm text-muted">불러오고 있어요…</div>
          ) : loadError ? (
            <div role="alert" className="rounded-2xl border border-red-400/20 py-20 text-center">
              <p className="text-sm text-red-200">{loadError}</p>
              <button type="button" onClick={() => setReloadIndex((value) => value + 1)} className="mt-4 rounded-lg border border-white/20 px-4 py-2 text-sm text-white hover:bg-white/10">다시 시도</button>
            </div>
          ) : entries.length === 0 ? (
            <div className="rounded-2xl border border-white/10 py-20 text-center">
              <p className="text-sm text-muted">조건에 맞는 기록이 없어요.</p>
              <button type="button" onClick={() => apply(DEFAULT_FILTERS)} className="mt-3 text-sm text-white/70 underline underline-offset-4 hover:text-white">필터 초기화</button>
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/10">
              <div className="overflow-x-auto">
                <table className="w-full table-fixed border-collapse text-left">
                  <caption className="sr-only">시간, 결과, 사건, 행위자, 대상을 포함한 감사로그</caption>
                  <thead className="bg-white/[0.04] text-[11px] font-medium uppercase tracking-wide text-white/40">
                    <tr>
                      <th scope="col" className="hidden w-44 px-4 py-3 md:table-cell">시간</th>
                      <th scope="col" className="w-20 px-3 py-3">결과</th>
                      <th scope="col" className="px-3 py-3">사건</th>
                      <th scope="col" className="hidden w-48 px-3 py-3 lg:table-cell">행위자</th>
                      <th scope="col" className="hidden w-40 px-4 py-3 lg:table-cell">대상</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.06]">
                    {entries.map((entry) => {
                      const selected = entry.id === selectedId;
                      return (
                        <tr key={entry.id} className={selected ? 'bg-white/[0.09]' : 'transition-colors hover:bg-white/[0.035]'}>
                          <td className="hidden px-4 py-3 align-top text-xs tabular-nums text-white/45 md:table-cell">
                            <time dateTime={entry.occurredAt}>{formatKst(entry.occurredAt)}</time>
                          </td>
                          <td className="px-3 py-3 align-top"><OutcomeBadge outcome={entry.outcome} /></td>
                          <td className="px-3 py-3 align-top">
                            <button
                              type="button"
                              aria-expanded={selected}
                              aria-controls="audit-detail-panel"
                              onClick={() => setSelectedId(selected ? null : entry.id)}
                              className="w-full rounded text-left outline-none focus-visible:ring-2 focus-visible:ring-white/60"
                            >
                              <span className="block truncate text-sm font-medium text-white">{describe(entry)}</span>
                              <span className="mt-1 block text-xs text-white/40">{EVENT_TYPE_INFO[entry.eventType].label} · {ACTION_LABELS[entry.action]}</span>
                              <span className="mt-1 block truncate text-[11px] text-white/35 lg:hidden">{actorText(entry)} · {targetText(entry)}</span>
                              <time dateTime={entry.occurredAt} className="mt-1 block text-[11px] tabular-nums text-white/30 md:hidden">{formatKst(entry.occurredAt)}</time>
                            </button>
                          </td>
                          <td className="hidden truncate px-3 py-3 align-top text-xs text-white/55 lg:table-cell">{actorText(entry)}</td>
                          <td className="hidden truncate px-4 py-3 align-top text-xs text-white/55 lg:table-cell">{targetText(entry)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {totalPages > 1 && !loading && !loadError && (
            <nav aria-label="감사로그 페이지" className="mt-5 flex items-center justify-center gap-4 text-sm">
              <button type="button" disabled={page <= 0} onClick={() => changePage(Math.max(page - 1, 0))} className="rounded-lg px-3 py-2 text-muted hover:bg-white/[0.05] hover:text-white disabled:opacity-30">← 이전</button>
              <span className="text-xs tabular-nums text-white/40">{page + 1} / {totalPages}</span>
              <button type="button" disabled={page >= totalPages - 1} onClick={() => changePage(page + 1)} className="rounded-lg px-3 py-2 text-muted hover:bg-white/[0.05] hover:text-white disabled:opacity-30">다음 →</button>
            </nav>
          )}
        </section>

        {selectedEntry && (
          <AuditDetail entry={selectedEntry} onClose={() => setSelectedId(null)} onTargetHistory={() => showTargetHistory(selectedEntry)} />
        )}
      </div>

      {showGuide && <AuditGuide onClose={() => setShowGuide(false)} />}
    </div>
  );
}

function FilterSelect({ label, value, onChange, children }: { label: string; value: string; onChange(value: string): void; children: React.ReactNode }) {
  return (
    <label>
      <span className="mb-1 block text-xs text-white/45">{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} className={inputClass}>{children}</select>
    </label>
  );
}

function FilterInput({ label, value, onChange, ...props }: { label: string; value: string; onChange(value: string): void } & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'>) {
  return (
    <label>
      <span className="mb-1 block text-xs text-white/45">{label}</span>
      <input {...props} value={value} onChange={(event) => onChange(event.target.value)} className={`${inputClass} disabled:cursor-not-allowed disabled:opacity-40`} />
    </label>
  );
}

function OutcomeBadge({ outcome }: { outcome: AuditOutcome }) {
  const failed = outcome === 'FAILURE';
  return (
    <span className={`inline-flex rounded-full border px-2 py-1 text-[11px] font-semibold ${failed ? 'border-red-400/30 bg-red-400/10 text-red-200' : 'border-emerald-400/25 bg-emerald-400/10 text-emerald-200'}`}>
      {failed ? '실패' : '성공'}
    </span>
  );
}

function DetailItem({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-[11px] uppercase tracking-wide text-white/35">{label}</dt>
      <dd className="mt-1 break-words text-sm text-white/75">{children || '—'}</dd>
    </div>
  );
}

function AuditDetail({ entry, onClose, onTargetHistory }: { entry: AuditLogEntry; onClose(): void; onTargetHistory(): void }) {
  const changes = entry.detail ? parseChanges(entry.detail) : [];
  const closeButton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    closeButton.current?.focus();
  }, []);
  return (
    <aside
      id="audit-detail-panel"
      role="region"
      aria-label="선택한 감사 사건 상세"
      className="fixed inset-0 z-50 overflow-y-auto bg-neutral-950 p-5 xl:sticky xl:top-5 xl:z-auto xl:max-h-[calc(100vh-2.5rem)] xl:rounded-2xl xl:border xl:border-white/10 xl:bg-white/[0.025]"
    >
      <div className="mb-5 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-2"><OutcomeBadge outcome={entry.outcome} /><span className="text-xs text-white/40">#{entry.id}</span></div>
          <h2 className="text-lg font-bold text-white">{describe(entry)}</h2>
          <p className="mt-1 text-xs text-white/40">{EVENT_TYPE_INFO[entry.eventType].label} · {ACTION_LABELS[entry.action]}</p>
        </div>
        <button ref={closeButton} type="button" onClick={onClose} className="shrink-0 rounded-lg border border-white/15 px-3 py-1.5 text-sm text-white/70 hover:bg-white/[0.07] hover:text-white">닫기 <span aria-hidden="true">×</span></button>
      </div>

      <section className="border-t border-white/10 py-5">
        <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-white/50">사건 맥락</h3>
        <dl className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
          <DetailItem label="발생 시각"><time dateTime={entry.occurredAt}>{formatKst(entry.occurredAt)}</time></DetailItem>
          <DetailItem label="행위자">{actorText(entry)}{entry.actorId != null && entry.actorLabel ? ` · ID ${entry.actorId}` : ''}</DetailItem>
          <DetailItem label="대상">{targetText(entry)}</DetailItem>
        </dl>
        {entry.targetType && (
          <button type="button" onClick={onTargetHistory} className="mt-4 rounded-lg border border-white/15 px-3 py-2 text-xs text-white/70 hover:bg-white/[0.06] hover:text-white">같은 대상의 전체 이력 보기 →</button>
        )}
      </section>

      <section className="border-t border-white/10 py-5">
        <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-white/50">요청 정보</h3>
        <dl className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
          <DetailItem label="HTTP 요청">{entry.httpMethod || '—'}{entry.path ? <code className="ml-2 break-all text-xs text-white/60">{entry.path}</code> : null}</DetailItem>
          <DetailItem label="상태 코드">{entry.statusCode ?? '—'}</DetailItem>
          <DetailItem label="클라이언트 IP">{entry.clientIp ?? '—'}</DetailItem>
        </dl>
      </section>

      <section className="border-t border-white/10 pt-5">
        <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-white/50">변경 내용</h3>
        {changes.length === 0 ? (
          <p className="text-sm text-white/35">이 사건에는 필드 변경 내역이 없습니다.</p>
        ) : (
          <div className="space-y-3">
            {changes.map((change, index) => (
              <div key={`${change.label}-${index}`} className="rounded-xl border border-white/[0.08] bg-black/20 p-3">
                <p className="text-xs font-semibold text-white/65">{change.label}</p>
                {change.before !== undefined ? (
                  <div className="mt-2 grid gap-2 text-xs sm:grid-cols-[1fr_auto_1fr] xl:grid-cols-1">
                    <div><span className="block text-[10px] text-white/30">이전</span><span className="break-words text-white/55">{change.before}</span></div>
                    <span aria-hidden="true" className="self-center text-white/25 xl:hidden">→</span>
                    <div><span className="block text-[10px] text-white/30">이후</span><span className="break-words text-white/85">{change.after}</span></div>
                  </div>
                ) : (
                  <p className="mt-2 break-words text-xs text-white/65">{change.value}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </aside>
  );
}

function AuditGuide({ onClose }: { onClose(): void }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div role="dialog" aria-modal="true" aria-labelledby="audit-guide-title" className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-white/10 bg-neutral-900 p-6 shadow-2xl">
        <div className="mb-3 flex items-start justify-between gap-4">
          <div><h2 id="audit-guide-title" className="text-lg font-bold text-white">감사기록 범위</h2><p className="mt-1 text-sm text-muted">기록 종류는 shared 계약과 연결되어 새 분류가 추가되면 이 화면도 함께 갱신됩니다.</p></div>
          <button type="button" autoFocus onClick={onClose} className="rounded-lg border border-white/15 px-3 py-1.5 text-sm text-white/70 hover:bg-white/[0.07] hover:text-white">닫기</button>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {EVENT_TYPES.map((type) => (
            <div key={type} className="rounded-xl border border-white/[0.08] bg-white/[0.025] p-4">
              <h3 className="text-sm font-semibold text-white">{EVENT_TYPE_INFO[type].label}</h3>
              <p className="mt-1 text-sm leading-relaxed text-white/55">{EVENT_TYPE_INFO[type].description}</p>
            </div>
          ))}
        </div>
        <p className="mt-5 text-xs leading-relaxed text-white/40">주요 활동 보기는 감사 검토 기록만 숨깁니다. 기록이 삭제되는 것은 아니며 전체 보기에서 언제든 확인할 수 있습니다.</p>
      </div>
    </div>
  );
}
