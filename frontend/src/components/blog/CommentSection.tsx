'use client';

import { useEffect, useState } from 'react';
import type { Comment } from '@/types/feed';
import { getComments, createComment, FeedApiError } from '@/lib/feedApi';
import { formatDate } from '@/lib/formatDate';

type LoadState = 'loading' | 'ready' | 'error';

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
  const [reloadIndex, setReloadIndex] = useState(0);

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

  function handleRetry() {
    setLoadState('loading');
    setReloadIndex((v) => v + 1);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting || !content.trim()) return;

    setSubmitting(true);
    setSubmitError('');
    try {
      const created = await createComment(postId, {
        nickname: nickname.trim() || undefined,
        content: content.trim(),
      });
      setComments((prev) => [...prev, created]);
      setContent('');
      setNickname('');
    } catch (err) {
      setSubmitError(err instanceof FeedApiError ? err.message : '댓글 작성에 실패했어요.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section aria-label="댓글">
      <h2 className="mb-6 text-xl font-bold text-white">
        댓글 {loadState === 'ready' ? comments.length : initialCount}
      </h2>

      {loadState === 'loading' && (
        <div className="mb-8 flex flex-col gap-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="h-14 w-full animate-pulse rounded-xl bg-white/5" />
          ))}
        </div>
      )}

      {loadState === 'error' && (
        <div className="mb-8 flex flex-col items-start gap-3 text-sm text-muted">
          <p>댓글을 불러오지 못했어요.</p>
          <button
            type="button"
            onClick={handleRetry}
            className="rounded-full border border-white/20 px-4 py-1.5 text-white transition-colors hover:bg-white/10"
          >
            다시 시도
          </button>
        </div>
      )}

      {loadState === 'ready' && (
        <ul className="mb-8 flex flex-col gap-4">
          {comments.length === 0 ? (
            <li className="text-sm text-muted">첫 댓글을 남겨보세요.</li>
          ) : (
            comments.map((comment) => (
              <li
                key={comment.id}
                className="rounded-xl border border-white/10 bg-white/[0.03] p-4"
              >
                <p className="mb-1 text-sm font-semibold text-accent">
                  {comment.nickname ?? '익명'}
                  <span className="ml-2 font-normal text-muted">
                    {formatDate(comment.createdAt)}
                  </span>
                </p>
                <p className="whitespace-pre-wrap break-words text-sm text-white/90">
                  {comment.content}
                </p>
              </li>
            ))
          )}
        </ul>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <input
          type="text"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          placeholder="닉네임 (선택, 비우면 익명)"
          maxLength={50}
          className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white placeholder:text-muted outline-none focus:border-white/30"
        />
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="댓글을 남겨보세요"
          required
          maxLength={300}
          rows={3}
          className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-muted outline-none focus:border-white/30"
        />
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted">{content.length}/300</p>
          <button
            type="submit"
            disabled={submitting || !content.trim()}
            className="rounded-full border border-white/20 bg-white/10 px-5 py-2 text-sm text-white transition-colors hover:bg-white/20 disabled:opacity-40"
          >
            {submitting ? '등록 중…' : '댓글 등록'}
          </button>
        </div>
        {submitError && <p className="text-sm text-red-400">{submitError}</p>}
      </form>
    </section>
  );
}
