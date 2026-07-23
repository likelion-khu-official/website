'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  refreshSession,
  getAdminPosts,
  updatePostStatus,
  AdminApiError,
} from '@/lib/adminApi';
import type { PostSummary, PostStatus } from '@shared/types/feed';
import { formatDate } from '@/lib/formatDate';

const STATUS_LABEL: Record<PostStatus, string> = {
  DRAFT: '초안',
  PUBLISHED: '게시됨',
  HIDDEN: '숨김',
};

const STATUS_CLASS: Record<PostStatus, string> = {
  DRAFT: 'text-amber-300 border-amber-300/30 bg-amber-300/10',
  PUBLISHED: 'text-emerald-300 border-emerald-300/30 bg-emerald-300/10',
  HIDDEN: 'text-muted border-white/20 bg-white/5',
};

export default function BlogManager() {
  const router = useRouter();

  const [posts, setPosts] = useState<PostSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [busyId, setBusyId] = useState<number | null>(null);
  const [rowError, setRowError] = useState('');
  const [reloadIndex, setReloadIndex] = useState(0);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      setLoadError('');
      try {
        // 로그인 가드 — 세션이 없으면 여기서 401이 나 로그인 화면으로 보낸다 (대시보드와 동일 패턴)
        await refreshSession();
        if (cancelled) return;
        const page = await getAdminPosts(0);
        if (cancelled) return;
        setPosts(page.content);
      } catch (err) {
        if (cancelled) return;
        if (
          err instanceof AdminApiError &&
          (err.status === 401 ||
            err.code === 'UNAUTHENTICATED' ||
            err.code === 'INVALID_REFRESH_TOKEN')
        ) {
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
  }, [reloadIndex, router]);

  async function changeStatus(post: PostSummary, next: PostStatus, confirmMsg: string) {
    if (!window.confirm(confirmMsg)) return;
    setBusyId(post.id);
    setRowError('');
    try {
      const updated = await updatePostStatus(post.id, next);
      setPosts((prev) => prev.map((p) => (p.id === post.id ? { ...p, status: updated.status } : p)));
    } catch (err) {
      setRowError(err instanceof AdminApiError ? err.message : '상태 변경에 실패했어요.');
    } finally {
      setBusyId(null);
    }
  }

  if (loading) {
    return <p className="py-24 text-center text-sm text-muted">불러오고 있어요…</p>;
  }

  if (loadError) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-24 text-center">
        <p className="text-sm text-muted">{loadError}</p>
        <button
          type="button"
          onClick={() => setReloadIndex((v) => v + 1)}
          className="rounded-full border border-white/20 bg-white/10 px-5 py-2 text-sm text-white transition-colors hover:bg-white/20"
        >
          다시 시도
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-8">
        <Link href="/admin" className="text-sm text-muted transition-colors hover:text-white">
          ← 대시보드
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-white">블로그 관리</h1>
        <p className="mt-1 text-sm text-muted">
          게시된 글을 숨기거나, 숨긴 글을 다시 게시할 수 있어요.
        </p>
      </div>

      {rowError && <p className="mb-4 text-sm text-red-400">{rowError}</p>}

      {posts.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted">글이 없어요.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {posts.map((post) => {
            const busy = busyId === post.id;
            return (
              <li
                key={post.id}
                className="flex flex-col gap-3 rounded-xl border border-white/10 bg-white/5 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className={`shrink-0 rounded-full border px-2 py-0.5 text-xs ${STATUS_CLASS[post.status]}`}
                    >
                      {STATUS_LABEL[post.status]}
                    </span>
                    <p className="truncate text-sm font-medium text-white">{post.title}</p>
                  </div>
                  <p className="mt-1 text-xs text-muted">
                    {post.authorName} · {formatDate(post.createdAt)}
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  {post.status === 'PUBLISHED' && (
                    <Link
                      href={`/blog/${post.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-full border border-white/20 px-4 py-1.5 text-sm text-white transition-colors hover:bg-white/10"
                    >
                      공개 글 보기 ↗
                    </Link>
                  )}
                  {post.status === 'PUBLISHED' ? (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() =>
                        changeStatus(
                          post,
                          'HIDDEN',
                          `"${post.title}" 글을 숨길까요? 공개 목록에서 사라져요.`
                        )
                      }
                      className="rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-sm text-white transition-colors hover:bg-white/20 disabled:opacity-40"
                    >
                      {busy ? '처리 중…' : '숨김'}
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() =>
                        changeStatus(
                          post,
                          'PUBLISHED',
                          `"${post.title}" 글을 게시할까요? 공개 목록에 올라와요.`
                        )
                      }
                      className="rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-sm text-white transition-colors hover:bg-white/20 disabled:opacity-40"
                    >
                      {busy ? '처리 중…' : post.status === 'DRAFT' ? '게시' : '다시 게시'}
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
