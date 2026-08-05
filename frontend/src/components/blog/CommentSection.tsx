'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { Comment } from '@shared/types/feed';
import { createComment, FeedApiError, getComments } from '@/lib/feedApi';

type LoadState = 'loading' | 'ready' | 'error';

function formatCommentDate(iso: string): string {
  // 백엔드 JVM 기본 타임존이 UTC라(TZ 설정 없음) 타임존 없는 문자열은 KST가 아니라 UTC 벽시계 값이다
  // (AuditLogViewer의 formatKst()와 동일한 이유) — UTC로 파싱한 뒤 Asia/Seoul로 표시해야 한다.
  const hasZone = /(?:Z|[+-]\d{2}:\d{2})$/.test(iso);
  const date = new Date(hasZone ? iso : `${iso}Z`);
  if (Number.isNaN(date.getTime())) return iso;

  return date.toLocaleString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Seoul',
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
      setSubmitNotice('댓글을 남겼어요.');
    } catch (error) {
      setSubmitError(
        error instanceof FeedApiError ? error.message : '댓글 작성에 실패했어요.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section aria-labelledby="comments-heading">
      <header className="flex items-baseline gap-2 border-b border-white/15 pb-4">
        <h2 id="comments-heading" className="text-xl font-semibold tracking-tight text-white">
          댓글
        </h2>
        <span aria-label={`공개 댓글 ${displayedCount}개`} className="text-sm text-white/50">
          {displayedCount}
        </span>
      </header>

      <form onSubmit={handleSubmit} aria-busy={submitting} className="border-b border-white/10 py-6">
        <fieldset disabled={composerDisabled} className="min-w-0 disabled:opacity-50">
          <legend className="sr-only">익명 댓글 작성</legend>

          <div className="flex items-center justify-between gap-4">
            <label htmlFor="comment-content" className="text-sm font-medium text-white">
              댓글 내용
            </label>
            <span id="comment-content-count" className="text-xs tabular-nums text-white/45">
              {content.length}/300
            </span>
          </div>
          <textarea
            id="comment-content"
            value={content}
            onChange={(event) => {
              setContent(event.target.value);
              clearSubmitFeedback();
            }}
            placeholder="이 글에 대한 생각을 남겨주세요."
            required
            maxLength={300}
            rows={4}
            aria-describedby="comment-content-hint comment-content-count"
            className="mt-2 min-h-28 w-full resize-y rounded-lg border border-white/15 bg-transparent px-4 py-3 text-[15px] leading-6 text-white outline-none placeholder:text-white/30 focus:border-accent focus-visible:ring-1 focus-visible:ring-accent disabled:cursor-not-allowed"
          />

          <div className="mt-3 grid gap-3 sm:grid-cols-[minmax(180px,260px)_1fr_auto] sm:items-end">
            <div>
              <label htmlFor="comment-nickname" className="text-xs font-medium text-white/60">
                닉네임 <span className="text-white/35">선택</span>
              </label>
              <input
                id="comment-nickname"
                type="text"
                value={nickname}
                onChange={(event) => {
                  setNickname(event.target.value);
                  clearSubmitFeedback();
                }}
                placeholder="미입력 시 익명"
                maxLength={50}
                aria-describedby="comment-nickname-hint"
                className="mt-1.5 min-h-11 w-full rounded-lg border border-white/15 bg-transparent px-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-accent focus-visible:ring-1 focus-visible:ring-accent disabled:cursor-not-allowed"
              />
              <span id="comment-nickname-hint" className="sr-only">
                닉네임은 선택 사항이며 최대 50자입니다.
              </span>
            </div>

            <p id="comment-content-hint" className="text-xs leading-5 text-white/45">
              로그인 없이 공개되며 등록 후 수정·삭제할 수 없습니다.
            </p>

            <button
              type="submit"
              disabled={composerDisabled || !content.trim()}
              className="inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-accent px-5 text-sm font-semibold text-white outline-none transition-colors hover:bg-[#e94900] focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto motion-reduce:transition-none"
            >
              {submitting ? '등록 중…' : '댓글 등록'}
            </button>
          </div>
        </fieldset>

        {loadState !== 'ready' ? (
          <p className="mt-3 text-xs text-white/40">댓글을 불러온 뒤 작성할 수 있어요.</p>
        ) : null}
        {submitNotice ? (
          <p role="status" className="mt-4 border-l-2 border-emerald-400 pl-3 text-sm text-emerald-200">
            {submitNotice}
          </p>
        ) : null}
        {submitError ? (
          <p role="alert" className="mt-4 border-l-2 border-red-400 pl-3 text-sm text-red-200">
            {submitError}
          </p>
        ) : null}
      </form>

      <div aria-live="polite" aria-busy={loadState === 'loading'}>
        {loadState === 'loading' ? (
          <div role="status" className="divide-y divide-white/10">
            <span className="sr-only">댓글을 불러오고 있어요.</span>
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} aria-hidden className="space-y-3 py-6">
                <div className="h-3 w-28 animate-pulse rounded bg-white/[0.07] motion-reduce:animate-none" />
                <div className="h-4 w-4/5 animate-pulse rounded bg-white/[0.05] motion-reduce:animate-none" />
              </div>
            ))}
          </div>
        ) : null}

        {loadState === 'error' ? (
          <div role="alert" className="flex min-h-40 flex-col items-center justify-center border-b border-white/10 text-center">
            <p className="text-sm font-medium text-white">댓글을 불러오지 못했어요.</p>
            <button
              type="button"
              onClick={handleRetry}
              className="mt-4 inline-flex min-h-11 items-center justify-center rounded-lg border border-white/20 px-4 text-sm text-white outline-none hover:bg-white/5 focus-visible:ring-2 focus-visible:ring-accent"
            >
              다시 시도
            </button>
          </div>
        ) : null}

        {loadState === 'ready' && comments.length === 0 ? (
          <div className="flex min-h-36 flex-col items-center justify-center border-b border-white/10 text-center">
            <p className="text-sm font-medium text-white">아직 댓글이 없어요.</p>
            <p className="mt-1 text-xs text-white/45">첫 댓글을 남겨보세요.</p>
          </div>
        ) : null}

        {loadState === 'ready' && comments.length > 0 ? (
          <ul aria-label="댓글 목록" className="divide-y divide-white/10">
            {comments.map((comment) => {
              const isNew = comment.id === newCommentId;
              const formattedDate = formatCommentDate(comment.createdAt);

              return (
                <li
                  id={`comment-${comment.id}`}
                  key={comment.id}
                  ref={isNew ? newCommentRef : undefined}
                  className={`py-6 ${isNew ? 'border-l-2 border-accent pl-4' : ''}`}
                >
                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                    <p className={`text-sm font-semibold ${comment.hidden ? 'text-white/45' : 'text-white'}`}>
                      {comment.hidden ? '숨김 처리된 댓글' : (comment.nickname ?? '익명')}
                    </p>
                    <time dateTime={comment.createdAt} title={formattedDate} className="text-xs text-white/40">
                      {formattedDate}
                    </time>
                    {isNew ? <span className="text-xs font-medium text-accent">방금 등록</span> : null}
                  </div>
                  <p className={`mt-2 whitespace-pre-wrap break-words text-[15px] leading-7 ${comment.hidden ? 'text-white/40' : 'text-white/75'}`}>
                    {comment.hidden ? '관리자에 의해 가려진 댓글입니다.' : comment.content}
                  </p>
                </li>
              );
            })}
          </ul>
        ) : null}
      </div>
    </section>
  );
}
