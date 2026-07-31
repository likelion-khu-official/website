'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import type { AdminComment } from '@shared/types/feed';
import {
  AdminApiError,
  listAdminComments,
  updateCommentVisibility,
} from '@/lib/adminApi';
import { formatDate } from '@/lib/formatDate';

type Filter = 'ALL' | 'VISIBLE' | 'HIDDEN';

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'ALL', label: '전체' },
  { value: 'VISIBLE', label: '공개' },
  { value: 'HIDDEN', label: '가려짐' },
];

export default function CommentModeration() {
  const [comments, setComments] = useState<AdminComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [filter, setFilter] = useState<Filter>('ALL');
  const [query, setQuery] = useState('');
  const [busyId, setBusyId] = useState<number | null>(null);
  const [notice, setNotice] = useState('');
  const [rowError, setRowError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      setComments(await listAdminComments());
    } catch (error) {
      setLoadError(
        error instanceof AdminApiError ? error.message : '댓글 목록을 불러오지 못했어요.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    listAdminComments()
      .then((data) => {
        if (!cancelled) setComments(data);
      })
      .catch((error) => {
        if (!cancelled) {
          setLoadError(
            error instanceof AdminApiError ? error.message : '댓글 목록을 불러오지 못했어요.'
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const filteredComments = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return comments.filter((comment) => {
      if (filter === 'VISIBLE' && comment.hidden) return false;
      if (filter === 'HIDDEN' && !comment.hidden) return false;
      if (!normalizedQuery) return true;
      return [comment.content, comment.nickname ?? '', comment.postTitle, comment.anonymousActorLabel]
        .some((value) => value.toLowerCase().includes(normalizedQuery));
    });
  }, [comments, filter, query]);

  async function toggleVisibility(comment: AdminComment) {
    const nextHidden = !comment.hidden;
    let reason: string | undefined;
    if (nextHidden) {
      const input = window.prompt(
        '가리는 이유를 입력해 주세요. 관리자에게만 보이며 비워도 됩니다.',
        ''
      );
      if (input === null) return;
      reason = input.trim() || undefined;
    } else if (!window.confirm('이 댓글을 공개 화면에 다시 보여줄까요?')) {
      return;
    }

    setBusyId(comment.id);
    setRowError('');
    setNotice('');
    try {
      const updated = await updateCommentVisibility(comment.id, {
        hidden: nextHidden,
        reason,
      });
      setComments((current) =>
        current.map((item) => (item.id === updated.id ? updated : item))
      );
      setNotice(nextHidden ? '댓글을 가렸습니다.' : '댓글을 다시 공개했습니다.');
    } catch (error) {
      setRowError(
        error instanceof AdminApiError
          ? error.message
          : nextHidden
            ? '댓글을 가리지 못했어요.'
            : '댓글을 다시 공개하지 못했어요.'
      );
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="mx-auto w-full max-w-6xl">
      <header className="border-b border-white/10 pb-6">
        <Link
          href="/admin"
          className="inline-flex min-h-11 items-center rounded-lg text-sm text-muted outline-none transition-colors hover:text-white focus-visible:ring-2 focus-visible:ring-accent"
        >
          ← 대시보드
        </Link>
        <div className="mt-2 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold tracking-[0.18em] text-accent">COMMENT SAFETY</p>
            <h1 className="mt-2 text-2xl font-bold text-white sm:text-3xl">댓글 검열</h1>
            <p className="mt-2 text-sm text-muted">
              익명 작성 신호를 참고해 문제 댓글을 가리고, 필요하면 다시 공개해요.
            </p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm">
            <span className="text-muted">전체 </span>
            <strong className="text-white">{comments.length}</strong>
            <span className="ml-4 text-muted">가려짐 </span>
            <strong className="text-amber-300">
              {comments.filter((comment) => comment.hidden).length}
            </strong>
          </div>
        </div>
      </header>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <div className="flex gap-2" aria-label="댓글 상태 필터">
          {FILTERS.map((item) => (
            <button
              key={item.value}
              type="button"
              aria-pressed={filter === item.value}
              onClick={() => setFilter(item.value)}
              className={`min-h-11 rounded-full border px-4 text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-accent ${
                filter === item.value
                  ? 'border-white bg-white text-black'
                  : 'border-white/15 text-white hover:bg-white/10'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="댓글, 게시글, 익명 ID 검색"
          aria-label="댓글 검색"
          className="min-h-11 min-w-0 flex-1 rounded-full border border-white/10 bg-white/5 px-4 text-sm text-white placeholder:text-muted outline-none focus-visible:ring-2 focus-visible:ring-accent"
        />
      </div>

      {notice && (
        <p role="status" className="mt-4 rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-200">
          {notice}
        </p>
      )}
      {rowError && <p role="alert" className="mt-4 text-sm text-red-400">{rowError}</p>}

      {loading ? (
        <p className="py-20 text-center text-sm text-muted">댓글을 불러오고 있어요…</p>
      ) : loadError ? (
        <div className="flex flex-col items-center gap-4 py-20 text-center">
          <p className="text-sm text-muted">{loadError}</p>
          <button
            type="button"
            onClick={() => void load()}
            className="min-h-11 rounded-full border border-white/20 px-5 text-sm text-white"
          >
            다시 시도
          </button>
        </div>
      ) : filteredComments.length === 0 ? (
        <p className="py-20 text-center text-sm text-muted">조건에 맞는 댓글이 없어요.</p>
      ) : (
        <ul className="mt-5 grid gap-4 xl:grid-cols-2">
          {filteredComments.map((comment) => {
            const busy = busyId === comment.id;
            return (
              <li
                key={comment.id}
                className={`overflow-hidden rounded-2xl border ${
                  comment.hidden
                    ? 'border-amber-300/25 bg-amber-300/[0.04]'
                    : 'border-white/10 bg-white/[0.035]'
                }`}
              >
                <div className="border-b border-white/10 p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Link
                        href={`/blog/${comment.postSlug}`}
                        target="_blank"
                        className="break-words text-sm font-semibold text-white hover:underline"
                      >
                        {comment.postTitle} ↗
                      </Link>
                      <p className="mt-1 text-xs text-muted">
                        {comment.nickname ?? '익명'} · {formatDate(comment.createdAt)}
                      </p>
                    </div>
                    <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs ${
                      comment.hidden
                        ? 'bg-amber-300/15 text-amber-200'
                        : 'bg-emerald-300/10 text-emerald-200'
                    }`}>
                      {comment.hidden ? '가려짐' : '공개'}
                    </span>
                  </div>
                  <p className="mt-4 whitespace-pre-wrap break-words text-sm leading-6 text-white/90">
                    {comment.content}
                  </p>
                </div>

                <div className="grid gap-3 bg-black/15 p-5 text-xs sm:grid-cols-2">
                  <div>
                    <p className="text-white/40">브라우저 식별자</p>
                    <p className="mt-1 font-medium text-white">{comment.anonymousActorLabel}</p>
                    <p className="mt-0.5 text-muted">이 브라우저 댓글 {comment.actorCommentCount}개</p>
                  </div>
                  <div>
                    <p className="text-white/40">접속 신호</p>
                    <p className="mt-1 font-medium text-white">{comment.networkLabel}</p>
                    <p className="mt-0.5 text-muted">같은 네트워크 댓글 {comment.networkCommentCount}개</p>
                  </div>
                  <div>
                    <p className="text-white/40">기기</p>
                    <p className="mt-1 text-white/80">{comment.userAgent}</p>
                  </div>
                  {comment.hidden && (
                    <div>
                      <p className="text-white/40">최근 가림 처리</p>
                      <p className="mt-1 text-white/80">
                        {comment.hiddenByAdminName ?? '관리자'}
                        {comment.hiddenAt ? ` · ${formatDate(comment.hiddenAt)}` : ''}
                      </p>
                      {comment.hiddenReason && (
                        <p className="mt-0.5 break-words text-muted">{comment.hiddenReason}</p>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex justify-end p-4">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void toggleVisibility(comment)}
                    className="min-h-11 rounded-full border border-white/20 bg-white/10 px-5 text-sm text-white outline-none transition-colors hover:bg-white/20 focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-40"
                  >
                    {busy ? '처리 중…' : comment.hidden ? '다시 공개' : '댓글 가리기'}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
