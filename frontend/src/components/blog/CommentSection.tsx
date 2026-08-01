'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { Comment } from '@shared/types/feed';
import { getComments, createComment, FeedApiError } from '@/lib/feedApi';

type LoadState = 'loading' | 'ready' | 'error';

function formatCommentDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;

  return date.toLocaleString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function CommentSection({
  postId,
  initialCount,
}: {
  postId: number;
  initialCount: number;
}) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [nickname, setNickname] = useState('');
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitNotice, setSubmitNotice] = useState('');
  const [newCommentId, setNewCommentId] = useState<number | null>(null);
  const [reloadIndex, setReloadIndex] = useState(0);
  const newCommentRef = useRef<HTMLLIElement>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await getComments(postId);
        if (cancelled) return;
        setComments(data);
        setLoadState('ready');
      } catch {
        if (!cancelled) setLoadState('error');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [postId, reloadIndex]);

  useEffect(() => {
    if (newCommentId === null) return;

    const reduceMotion =
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    newCommentRef.current?.scrollIntoView?.({
      behavior: reduceMotion ? 'auto' : 'smooth',
      block: 'nearest',
    });
  }, [newCommentId]);

  const publicCommentCount = useMemo(
    () => comments.filter((comment) => !comment.hidden).length,
    [comments],
  );
  const displayedCount = loadState === 'ready' ? publicCommentCount : initialCount;
  const composerDisabled = loadState !== 'ready' || submitting;

  function clearSubmitFeedback() {
    if (submitError) setSubmitError('');
    if (submitNotice) setSubmitNotice('');
  }

  function handleRetry() {
    setLoadState('loading');
    setReloadIndex((value) => value + 1);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (composerDisabled || !content.trim()) return;

    setSubmitting(true);
    setSubmitError('');
    setSubmitNotice('');
    try {
      const created = await createComment(postId, {
        nickname: nickname.trim() || undefined,
        content: content.trim(),
      });
      setComments((current) => [...current, created]);
      setNewCommentId(created.id);
      setContent('');
      setNickname('');
      setSubmitNotice('댓글을 남겼어요. 아래 목록 끝에 새 댓글이 추가됐습니다.');
    } catch (error) {
      setSubmitError(
        error instanceof FeedApiError ? error.message : '댓글 작성에 실패했어요.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section aria-labelledby="comments-heading" className="min-w-0">
      <header className="mb-6 flex items-end justify-between gap-4 border-b border-white/10 pb-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
            Conversation
          </p>
          <h2 id="comments-heading" className="mt-2 text-2xl font-semibold tracking-tight text-white">
            댓글
          </h2>
        </div>
        <span
          aria-label={`공개 댓글 ${displayedCount}개`}
          className="inline-flex min-h-8 min-w-8 items-center justify-center rounded-full border border-white/10 bg-white/[0.05] px-2.5 text-sm tabular-nums text-white/70"
        >
          {displayedCount}
        </span>
      </header>

      <form
        onSubmit={handleSubmit}
        aria-busy={submitting}
        className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.035] p-4 sm:p-6"
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-12 -top-20 h-40 rounded-full bg-accent/10 blur-3xl"
        />
        <fieldset disabled={composerDisabled} className="relative min-w-0 disabled:opacity-55">
          <legend className="sr-only">익명 댓글 작성</legend>

          <div>
            <div className="flex items-center justify-between gap-3">
              <label htmlFor="comment-content" className="text-sm font-semibold text-white">
                댓글 내용 <span className="font-normal text-accent">필수</span>
              </label>
              <span className="text-xs text-white/40">최대 300자</span>
            </div>
            <textarea
              id="comment-content"
              value={content}
              onChange={(event) => {
                setContent(event.target.value);
                clearSubmitFeedback();
              }}
              placeholder="이 글을 읽고 떠오른 생각을 남겨보세요."
              required
              maxLength={300}
              rows={4}
              aria-describedby="comment-content-hint comment-content-count"
              className="mt-2 min-h-32 w-full resize-y rounded-2xl border border-white/10 bg-black/20 px-4 py-3.5 text-[15px] leading-6 text-white outline-none placeholder:text-white/30 transition-colors focus:border-accent/60 focus-visible:ring-2 focus-visible:ring-accent/60 disabled:cursor-not-allowed"
            />
            <div className="mt-2 flex items-start justify-between gap-4 text-xs">
              <p id="comment-content-hint" className="leading-5 text-white/45">
                로그인 없이 공개되며, 등록 후 직접 수정하거나 삭제할 수 없어요.
              </p>
              <p
                id="comment-content-count"
                className="shrink-0 tabular-nums text-white/55"
              >
                {content.length}/300
              </p>
            </div>
          </div>

          <div className="mt-5 grid min-w-0 gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
            <div className="min-w-0">
              <div className="flex items-center justify-between gap-3">
                <label htmlFor="comment-nickname" className="text-sm font-medium text-white/85">
                  닉네임 <span className="font-normal text-white/40">선택</span>
                </label>
                <span className="text-xs text-white/35">최대 50자</span>
              </div>
              <input
                id="comment-nickname"
                type="text"
                value={nickname}
                onChange={(event) => {
                  setNickname(event.target.value);
                  clearSubmitFeedback();
                }}
                placeholder="비우면 익명으로 표시돼요"
                maxLength={50}
                aria-describedby="comment-nickname-hint"
                className="mt-2 min-h-11 w-full rounded-xl border border-white/10 bg-black/20 px-4 text-sm text-white outline-none placeholder:text-white/30 transition-colors focus:border-accent/60 focus-visible:ring-2 focus-visible:ring-accent/60 disabled:cursor-not-allowed"
              />
              <p id="comment-nickname-hint" className="sr-only">
                닉네임은 선택 사항이며 최대 50자입니다. 비우면 익명으로 표시됩니다.
              </p>
            </div>

            <button
              type="submit"
              disabled={composerDisabled || !content.trim()}
              className="inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-accent px-6 text-sm font-semibold text-white outline-none transition-[background-color,transform] hover:bg-[#ff6a25] focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background active:translate-y-px disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto motion-reduce:transform-none"
            >
              {submitting ? '등록 중…' : '댓글 등록'}
            </button>
          </div>
        </fieldset>

        <div className="relative mt-5 border-t border-white/10 pt-4 text-xs leading-5 text-white/55">
          <p>
            서비스 보호를 위해 익명 브라우저 식별자와 가명 처리된 접속 정보를 일정 기간
            사용할 수 있어요.
          </p>
          {loadState !== 'ready' && (
            <p className="mt-1 text-white/40">댓글 목록을 불러온 뒤 작성할 수 있어요.</p>
          )}
        </div>

        {submitNotice && (
          <p
            role="status"
            className="relative mt-4 rounded-xl border border-emerald-300/20 bg-emerald-300/10 px-4 py-3 text-sm text-emerald-100"
          >
            {submitNotice}
          </p>
        )}
        {submitError && (
          <p
            role="alert"
            className="relative mt-4 rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-200"
          >
            {submitError}
          </p>
        )}
      </form>

      <div className="mt-10" aria-live="polite" aria-busy={loadState === 'loading'}>
        {loadState === 'loading' && (
          <div role="status" className="flex flex-col gap-5">
            <span className="sr-only">댓글을 불러오고 있어요.</span>
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} aria-hidden className="flex gap-3 border-b border-white/10 pb-5">
                <div className="h-10 w-10 shrink-0 animate-pulse rounded-full bg-white/[0.06] motion-reduce:animate-none" />
                <div className="min-w-0 flex-1 space-y-2.5 pt-1">
                  <div className="h-3 w-32 animate-pulse rounded bg-white/[0.06] motion-reduce:animate-none" />
                  <div className="h-4 w-full animate-pulse rounded bg-white/[0.05] motion-reduce:animate-none" />
                </div>
              </div>
            ))}
          </div>
        )}

        {loadState === 'error' && (
          <div
            role="alert"
            className="flex min-h-44 flex-col items-center justify-center rounded-2xl border border-dashed border-white/15 px-5 text-center"
          >
            <span aria-hidden className="text-2xl text-white/30">
              ↻
            </span>
            <p className="mt-3 text-sm font-medium text-white">댓글을 불러오지 못했어요.</p>
            <p className="mt-1 text-xs text-white/45">잠시 후 다시 불러와 주세요.</p>
            <button
              type="button"
              onClick={handleRetry}
              className="mt-4 inline-flex min-h-11 items-center justify-center rounded-full border border-white/20 px-5 text-sm text-white outline-none transition-colors hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-accent"
            >
              다시 시도
            </button>
          </div>
        )}

        {loadState === 'ready' && comments.length === 0 && (
          <div className="flex min-h-44 flex-col items-center justify-center rounded-2xl border border-dashed border-white/15 px-5 text-center">
            <span aria-hidden className="text-2xl text-accent/70">
              ◌
            </span>
            <p className="mt-3 text-sm font-semibold text-white">아직 댓글이 없어요.</p>
            <p className="mt-1 text-xs text-white/45">이 글의 첫 이야기를 남겨보세요.</p>
          </div>
        )}

        {loadState === 'ready' && comments.length > 0 && (
          <ul aria-label="댓글 목록" className="divide-y divide-white/10">
            {comments.map((comment) => {
              const isNew = comment.id === newCommentId;
              const formattedDate = formatCommentDate(comment.createdAt);

              return (
                <li
                  id={`comment-${comment.id}`}
                  key={comment.id}
                  ref={isNew ? newCommentRef : undefined}
                  className={`flex min-w-0 gap-3 py-5 first:pt-0 sm:gap-4 ${
                    isNew ? 'rounded-2xl bg-accent/[0.06] px-3 sm:px-4' : ''
                  }`}
                >
                  <div
                    aria-hidden
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border text-sm font-semibold ${
                      comment.hidden
                        ? 'border-white/10 bg-white/[0.03] text-white/30'
                        : 'border-accent/20 bg-accent/10 text-accent'
                    }`}
                  >
                    {comment.hidden ? '—' : (comment.nickname?.trim().slice(0, 1) ?? '익')}
                  </div>

                  <div className="min-w-0 flex-1">
                    {comment.hidden ? (
                      <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] px-4 py-3">
                        <p className="text-sm text-white/45">관리자에 의해 가려진 댓글입니다.</p>
                        <time
                          dateTime={comment.createdAt}
                          title={formattedDate}
                          className="mt-1 block text-xs text-white/30"
                        >
                          {formattedDate}
                        </time>
                      </div>
                    ) : (
                      <>
                        <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5">
                          <p className="max-w-full break-words text-sm font-semibold text-white">
                            {comment.nickname ?? '익명'}
                          </p>
                          <time
                            dateTime={comment.createdAt}
                            title={formattedDate}
                            className="text-xs text-white/40"
                          >
                            {formattedDate}
                          </time>
                          {isNew && (
                            <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[11px] font-medium text-accent">
                              방금 등록
                            </span>
                          )}
                        </div>
                        <p className="mt-2 whitespace-pre-wrap break-words text-[15px] leading-7 text-white/80">
                          {comment.content}
                        </p>
                      </>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
