'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { refreshSession, listAuditLogs, AdminApiError } from '@/lib/adminApi';
import type { AuditActionType, AuditActorType, AuditLogEntry } from '@shared/types/audit';

const ACTOR_LABELS: Record<AuditActorType, string> = {
  ADMIN: '관리자',
  MEMBER: '부원',
  ANONYMOUS: '익명',
  SYSTEM: '시스템',
};

const ACTION_FILTER_LABELS: Record<AuditActionType, string> = {
  STATE_CHANGE: '변경',
  LOGIN_SUCCESS: '로그인',
  LOGIN_FAILURE: '로그인 실패',
  LOGOUT: '로그아웃',
  SENSITIVE_READ: '민감 열람',
};

// action별 색 점 — 한눈에 종류를 구분한다.
const DOT_COLOR: Record<AuditActionType, string> = {
  STATE_CHANGE: 'bg-sky-400',
  LOGIN_SUCCESS: 'bg-emerald-400',
  LOGIN_FAILURE: 'bg-red-400',
  LOGOUT: 'bg-white/30',
  SENSITIVE_READ: 'bg-amber-400',
};

// 감사 이벤트 한 건을 "무엇을 했는지" 한 줄로 옮긴다. 상태변경은 서버가 남긴 요약(summary)을 그대로 쓰고,
// 요약이 없는 인증·열람 이벤트만 종류에 맞는 문구로 채운다.
function describe(entry: AuditLogEntry): string {
  if (entry.summary) return entry.summary;
  if (entry.action === 'LOGIN_SUCCESS') return '로그인';
  if (entry.action === 'LOGIN_FAILURE') return '로그인 실패';
  if (entry.action === 'LOGOUT') return '로그아웃';
  if (entry.action === 'SENSITIVE_READ') {
    if (entry.path?.includes('/applications')) return '지원자 명단 열람';
    if (entry.path?.includes('/audit-logs')) return '감사 로그 열람';
    return '민감 열람';
  }
  return '변경';
}

// 감사 로그는 초까지 정확한 시각이 중요하다 — 날짜만 주는 공용 formatDate 대신 풀 타임스탬프를 쓴다.
function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

// 이 화면이 감시하는 행동의 전체 목록 — "무엇이 기록되나요?" 모달에 그대로 보여준다.
// (BE의 명시 계측·인증 훅·민감 열람 필터가 실제로 남기는 것과 일치시켜 관리자가 범위를 알 수 있게 한다.)
const AUDITED_ACTIONS: { category: string; items: string[] }[] = [
  { category: '인증', items: ['관리자·부원 로그인 성공', '로그인 실패', '로그아웃'] },
  { category: '멤버 관리', items: ['멤버 등록·수정', '오프보딩', '비밀번호 초기화', '부원 본인 비밀번호 변경'] },
  { category: '운영진 소개', items: ['운영진 등록·수정·삭제'] },
  { category: '관리자 계정', items: ['관리자 초대·초대 취소', '관리자 삭제'] },
  { category: '콘텐츠', items: ['댓글 가리기·공개', '블로그 글 작성·수정·삭제·게시/숨김', '프로젝트 등록·수정·삭제·숨김'] },
  { category: '모집', items: ['모집 열기·닫기', '지원서 양식 수정'] },
  { category: '민감 열람', items: ['지원자 개인정보 명단 열람', '감사 로그 열람'] },
];

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
  const [showGuide, setShowGuide] = useState(false);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  const [actorType, setActorType] = useState<AuditActorType | ''>('');
  const [action, setAction] = useState<AuditActionType | ''>('');
  const [q, setQ] = useState('');
  const [applied, setApplied] = useState<{ actorType: AuditActorType | ''; action: AuditActionType | ''; q: string }>({
    actorType: '',
    action: '',
    q: '',
  });
  const [targetPage, setTargetPage] = useState(0);

  // dev StrictMode는 effect를 두 번 실행해 같은 조회가 두 번 나가고, 서버가 이 열람을 두 건으로 기록한다.
  // 같은 조회 파라미터로의 중복 실행을 걸러 요청을 한 번만 보낸다(필터·페이지가 바뀌면 정상적으로 다시 로드).
  const requestKey = useRef('');

  useEffect(() => {
    const key = `${applied.actorType}|${applied.action}|${applied.q}|${targetPage}`;
    if (requestKey.current === key) return;
    requestKey.current = key;
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
        // 그 사이 필터·페이지가 바뀌어 새 조회가 시작됐으면 이 응답은 버린다(최신 것만 반영).
        if (requestKey.current !== key) return;
        setEntries(res.entries);
        setPage(res.page);
        setTotalPages(res.totalPages);
        setTotalCount(res.totalCount);
      } catch (err) {
        if (requestKey.current !== key) return;
        if (err instanceof AdminApiError && err.status === 401) {
          router.replace('/admin/login');
          return;
        }
        setLoadError(err instanceof AdminApiError ? err.message : '불러오지 못했어요.');
      } finally {
        if (requestKey.current === key) setLoading(false);
      }
    })();
  }, [applied, targetPage, router]);

  function applyFilters(e: FormEvent) {
    e.preventDefault();
    setTargetPage(0);
    setApplied({ actorType, action, q: q.trim() });
  }

  function toggleDetail(id: number) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const selectClass =
    'min-h-9 rounded-lg border border-white/10 bg-white/5 px-2.5 text-sm text-white outline-none focus:border-white/25';

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-1 flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="text-2xl font-bold text-white">감사 로그</h1>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setShowGuide(true)}
            className="rounded-full border border-white/20 px-4 py-1.5 text-sm text-white transition-colors hover:bg-white/10"
          >
            무엇이 기록되나요?
          </button>
          <button
            type="button"
            onClick={() => router.push('/admin')}
            className="text-sm text-muted transition-colors hover:text-white"
          >
            ← 대시보드
          </button>
        </div>
      </div>
      <p className="mb-6 text-sm leading-relaxed text-muted">
        누가 무엇을 언제 했는지의 기록이에요. 관리자도 고치거나 지울 수 없고, 이 화면을 연 것도 함께 남아요.
      </p>

      <form onSubmit={applyFilters} className="mb-5 flex flex-wrap items-center gap-2">
        <select value={actorType} onChange={(e) => setActorType(e.target.value as AuditActorType | '')} className={selectClass}>
          <option value="">모든 주체</option>
          {(Object.keys(ACTOR_LABELS) as AuditActorType[]).map((key) => (
            <option key={key} value={key}>
              {ACTOR_LABELS[key]}
            </option>
          ))}
        </select>
        <select value={action} onChange={(e) => setAction(e.target.value as AuditActionType | '')} className={selectClass}>
          <option value="">모든 행위</option>
          {(Object.keys(ACTION_FILTER_LABELS) as AuditActionType[]).map((key) => (
            <option key={key} value={key}>
              {ACTION_FILTER_LABELS[key]}
            </option>
          ))}
        </select>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="이메일·학번 검색"
          className="min-h-9 min-w-[10rem] flex-1 rounded-lg border border-white/10 bg-white/5 px-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-white/25"
        />
        <button type="submit" className="min-h-9 rounded-lg bg-white px-4 text-sm font-medium text-black transition-colors hover:bg-white/90">
          적용
        </button>
      </form>

      {loading ? (
        <p className="py-24 text-center text-sm text-muted">불러오고 있어요…</p>
      ) : loadError ? (
        <p className="py-24 text-center text-sm text-muted">{loadError}</p>
      ) : entries.length === 0 ? (
        <p className="py-16 text-center text-sm text-muted">기록이 없어요.</p>
      ) : (
        <>
          <p className="mb-2 text-xs text-muted">전체 {totalCount.toLocaleString()}건</p>
          <ul className="overflow-hidden rounded-xl border border-white/10">
            {entries.map((entry, i) => {
              const title = describe(entry);
              const failed = entry.outcome === 'FAILURE';
              return (
                <li
                  key={entry.id}
                  className={`flex items-start gap-3 px-4 py-3 text-sm transition-colors hover:bg-white/[0.03] ${
                    i > 0 ? 'border-t border-white/5' : ''
                  }`}
                >
                  <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${failed ? 'bg-red-400' : DOT_COLOR[entry.action]}`} />
                  <div className="min-w-0 flex-1">
                    <p className="text-white">
                      <span className={failed ? 'text-red-300' : ''}>{title}</span>
                      {failed && <span className="ml-2 text-xs text-red-400">실패</span>}
                    </p>
                    <p className="truncate text-xs text-muted">
                      {ACTOR_LABELS[entry.actorType]}
                      {entry.actorLabel ? ` · ${entry.actorLabel}` : entry.actorId != null ? ` · #${entry.actorId}` : ''}
                    </p>
                    {entry.detail && (
                      <>
                        <button
                          type="button"
                          onClick={() => toggleDetail(entry.id)}
                          className="mt-1.5 text-xs text-white/40 transition-colors hover:text-white/70"
                        >
                          {expanded.has(entry.id) ? '변경 내용 접기 ▴' : '변경 내용 보기 ▾'}
                        </button>
                        {expanded.has(entry.id) && (
                          <pre className="mt-2 whitespace-pre-wrap rounded-lg border border-white/10 bg-black/20 p-3 font-mono text-xs leading-relaxed text-white/70">{entry.detail}</pre>
                        )}
                      </>
                    )}
                  </div>
                  <time className="mt-0.5 shrink-0 text-xs tabular-nums text-white/40">{formatDateTime(entry.occurredAt)}</time>
                </li>
              );
            })}
          </ul>

          {totalPages > 1 && (
            <div className="mt-5 flex items-center justify-center gap-4 text-sm">
              <button
                type="button"
                disabled={page <= 0}
                onClick={() => setTargetPage((p) => Math.max(p - 1, 0))}
                className="text-muted transition-colors hover:text-white disabled:opacity-30"
              >
                ← 이전
              </button>
              <span className="text-xs text-white/40">
                {page + 1} / {totalPages}
              </span>
              <button
                type="button"
                disabled={page >= totalPages - 1}
                onClick={() => setTargetPage((p) => p + 1)}
                className="text-muted transition-colors hover:text-white disabled:opacity-30"
              >
                다음 →
              </button>
            </div>
          )}
        </>
      )}

      {showGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-label="기록되는 행동"
            className="max-h-[80vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-white/10 bg-neutral-900 p-6"
          >
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-bold text-white">기록되는 행동</h2>
              <button
                type="button"
                onClick={() => setShowGuide(false)}
                className="rounded-full border border-white/20 px-3 py-1 text-sm text-white transition-colors hover:bg-white/10"
              >
                닫기
              </button>
            </div>
            <p className="mb-5 text-sm leading-relaxed text-muted">
              아래 행동이 일어나면 자동으로 감사 로그에 남아요. 관리자도 이 기록을 고치거나 지울 수 없어요.
            </p>
            <div className="flex flex-col gap-4">
              {AUDITED_ACTIONS.map((group) => (
                <div key={group.category}>
                  <h3 className="mb-1.5 text-sm font-semibold text-white">{group.category}</h3>
                  <ul className="flex flex-col gap-1">
                    {group.items.map((item) => (
                      <li key={item} className="flex gap-2 text-sm text-white/70">
                        <span className="text-white/30">·</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
