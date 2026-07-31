'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { refreshSession, listAuditLogs, AdminApiError } from '@/lib/adminApi';
import { formatDate } from '@/lib/formatDate';
import type { AuditActionType, AuditActorType, AuditLogEntry } from '@shared/types/audit';

const ACTOR_LABELS: Record<AuditActorType, string> = {
  ADMIN: '관리자',
  MEMBER: '부원',
  ANONYMOUS: '익명',
  SYSTEM: '시스템',
};

const ACTION_LABELS: Record<AuditActionType, string> = {
  STATE_CHANGE: '상태 변경',
  LOGIN_SUCCESS: '로그인 성공',
  LOGIN_FAILURE: '로그인 실패',
  LOGOUT: '로그아웃',
  SENSITIVE_READ: '민감 열람',
};

const PAGE_SIZE = 50;

// 리뷰 표면 — 감사 기록을 읽기 전용으로 검토한다. 수정·삭제 수단은 애초에 만들지 않는다(#338·#339).
export default function AuditLogViewer() {
  const router = useRouter();

  const [entries, setEntries] = useState<AuditLogEntry[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  // 입력 중 값과 실제 적용된 값을 분리 — "적용"을 눌러야 조회가 나간다. targetPage가 실제 요청 페이지다.
  const [actorType, setActorType] = useState<AuditActorType | ''>('');
  const [action, setAction] = useState<AuditActionType | ''>('');
  const [q, setQ] = useState('');
  const [applied, setApplied] = useState<{ actorType: AuditActorType | ''; action: AuditActionType | ''; q: string }>({
    actorType: '',
    action: '',
    q: '',
  });
  const [targetPage, setTargetPage] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setLoadError('');
      try {
        await refreshSession();
        const res = await listAuditLogs({
          actorType: applied.actorType || undefined,
          action: applied.action || undefined,
          q: applied.q || undefined,
          page: targetPage,
          size: PAGE_SIZE,
        });
        if (cancelled) return;
        setEntries(res.entries);
        setPage(res.page);
        setTotalPages(res.totalPages);
        setTotalCount(res.totalCount);
      } catch (err) {
        if (cancelled) return;
        if (err instanceof AdminApiError && err.status === 401) {
          router.replace('/admin/login');
          return;
        }
        setLoadError(err instanceof AdminApiError ? err.message : '불러오지 못했어요.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [applied, targetPage, router]);

  function applyFilters(e: FormEvent) {
    e.preventDefault();
    setTargetPage(0);
    setApplied({ actorType, action, q: q.trim() });
  }

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">감사 로그</h1>
          <p className="mt-1 max-w-xl text-sm leading-relaxed text-muted">
            관리자조차 수정·삭제할 수 없는 기록이에요. 읽기 전용이며, 이 화면을 연 것도 기록으로 남아요.
          </p>
        </div>
        <button
          type="button"
          onClick={() => router.push('/admin')}
          className="rounded-full border border-white/20 px-4 py-1.5 text-sm text-white transition-colors hover:bg-white/10"
        >
          ← 대시보드
        </button>
      </div>

      <form
        onSubmit={applyFilters}
        className="mb-6 flex flex-wrap items-end gap-3 rounded-xl border border-white/10 bg-white/5 p-4"
      >
        <label className="flex flex-col gap-1 text-xs text-muted">
          주체
          <select
            value={actorType}
            onChange={(e) => setActorType(e.target.value as AuditActorType | '')}
            className="min-h-9 rounded-lg border border-white/15 bg-black/30 px-2 text-sm text-white"
          >
            <option value="">전체</option>
            {(Object.keys(ACTOR_LABELS) as AuditActorType[]).map((key) => (
              <option key={key} value={key}>
                {ACTOR_LABELS[key]}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted">
          행위
          <select
            value={action}
            onChange={(e) => setAction(e.target.value as AuditActionType | '')}
            className="min-h-9 rounded-lg border border-white/15 bg-black/30 px-2 text-sm text-white"
          >
            <option value="">전체</option>
            {(Object.keys(ACTION_LABELS) as AuditActionType[]).map((key) => (
              <option key={key} value={key}>
                {ACTION_LABELS[key]}
              </option>
            ))}
          </select>
        </label>
        <label className="flex min-w-[12rem] flex-1 flex-col gap-1 text-xs text-muted">
          검색 (행위자·경로)
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="이메일·학번·경로"
            className="min-h-9 rounded-lg border border-white/15 bg-black/30 px-2 text-sm text-white placeholder:text-white/30"
          />
        </label>
        <button
          type="submit"
          className="min-h-9 rounded-lg bg-white px-4 text-sm font-medium text-black transition-colors hover:bg-white/90"
        >
          적용
        </button>
      </form>

      {loading ? (
        <p className="py-24 text-center text-sm text-muted">불러오고 있어요…</p>
      ) : loadError ? (
        <p className="py-24 text-center text-sm text-muted">{loadError}</p>
      ) : entries.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted">기록이 없어요.</p>
      ) : (
        <>
          <p className="mb-3 text-xs text-muted">전체 {totalCount.toLocaleString()}건</p>
          <ul className="flex flex-col gap-2">
            {entries.map((entry) => (
              <li key={entry.id} className="rounded-xl border border-white/10 bg-white/5 p-4">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                  <span
                    className={`rounded-md px-2 py-0.5 text-xs font-medium ${
                      entry.outcome === 'FAILURE' ? 'bg-red-500/20 text-red-300' : 'bg-white/10 text-white/70'
                    }`}
                  >
                    {ACTION_LABELS[entry.action]}
                  </span>
                  <span className="text-white">
                    {ACTOR_LABELS[entry.actorType]}
                    {entry.actorLabel
                      ? ` · ${entry.actorLabel}`
                      : entry.actorId != null
                        ? ` · #${entry.actorId}`
                        : ''}
                  </span>
                  <span className="ml-auto text-xs text-muted">{formatDate(entry.occurredAt)}</span>
                </div>
                {(entry.httpMethod || entry.path) && (
                  <p className="mt-1.5 break-all font-mono text-xs text-white/50">
                    {entry.httpMethod} {entry.path}
                    {entry.statusCode != null ? ` → ${entry.statusCode}` : ''}
                  </p>
                )}
              </li>
            ))}
          </ul>

          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-center gap-3 text-sm">
              <button
                type="button"
                disabled={page <= 0}
                onClick={() => setTargetPage((p) => Math.max(p - 1, 0))}
                className="rounded-full border border-white/20 px-3 py-1 text-white transition-colors hover:bg-white/10 disabled:opacity-40"
              >
                이전
              </button>
              <span className="text-muted">
                {page + 1} / {totalPages}
              </span>
              <button
                type="button"
                disabled={page >= totalPages - 1}
                onClick={() => setTargetPage((p) => p + 1)}
                className="rounded-full border border-white/20 px-3 py-1 text-white transition-colors hover:bg-white/10 disabled:opacity-40"
              >
                다음
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
