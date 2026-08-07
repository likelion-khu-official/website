'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { MemberPostSummary, SpringPage } from '@shared/types/feed';
import { formatDate } from '@/lib/formatDate';
import { deletePost, getMemberPosts, MemberApiError } from '@/lib/memberApi';
import { useMemberResource } from '@/components/member/hooks/useMemberResource';
import PageHeader from '@/components/member/ui/PageHeader';
import ErrorAlert from '@/components/member/ui/ErrorAlert';
import EmptyState from '@/components/member/ui/EmptyState';
import { Skeleton } from '@/components/member/ui/MemberSkeleton';
import { PostStatusBadge } from '@/components/member/ui/StatusBadge';
import Thumb from '@/components/member/ui/Thumb';
import { dangerGhostButton, primaryButton, rowAction, rowCard } from '@/components/member/ui/styles';
import { monogram } from '@/components/member/ui/monogram';

const PAGE_SIZE = 24;

export default function MemberPostsDashboard() {
  const router = useRouter();
  const [page, setPage] = useState(0);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [deleteError, setDeleteError] = useState('');

  const { data, setData, loading, error, reload } = useMemberResource<SpringPage<MemberPostSummary>>(
    () => getMemberPosts(page, PAGE_SIZE),
    [page]
  );

  const posts = data?.content ?? [];

  async function handleDelete(post: MemberPostSummary) {
    const confirmed = window.confirm(
      `“${post.title}” 글을 삭제할까요?\n\n댓글까지 DB에서 완전히 제거되며 되돌릴 수 없습니다.`
    );
    if (!confirmed) return;

    setDeletingId(post.id);
    setDeleteError('');
    try {
      await deletePost(post.id);
      if (posts.length === 1 && page > 0) {
        setPage((current) => current - 1);
      } else {
        setData((current) =>
          current ? { ...current, content: current.content.filter((item) => item.id !== post.id) } : current
        );
      }
    } catch (err) {
      if (
        err instanceof MemberApiError &&
        (err.status === 401 || err.code === 'MUST_CHANGE_PASSWORD')
      ) {
        router.replace('/member/login?returnTo=%2Fmember%2Fposts');
        return;
      }
      setDeleteError(err instanceof Error ? err.message : '글 삭제에 실패했어요.');
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div>
      <PageHeader
        kicker="Blog"
        title="내 글"
        description="내가 쓴 공개·숨김 글을 확인하고 내용을 관리할 수 있어요."
        action={
          <Link href="/member/write" className={primaryButton}>
            <span aria-hidden>＋</span> 새 글
          </Link>
        }
      />

      {error ? <ErrorAlert className="mt-8" message={error} onRetry={reload} /> : null}
      {deleteError ? <ErrorAlert className="mt-8" message={deleteError} /> : null}

      {loading ? (
        <ul className="mt-8 flex flex-col gap-3">
          {[0, 1, 2, 3].map((item) => (
            <li key={item}>
              <Skeleton className="h-[104px] rounded-2xl" />
            </li>
          ))}
        </ul>
      ) : posts.length === 0 ? (
        <div className="mt-10">
          <EmptyState
            title="아직 작성한 글이 없어요."
            description="첫 글을 작성하면 방문자에게 바로 공개돼요."
            action={
              <Link href="/member/write" className={primaryButton}>
                <span aria-hidden>＋</span> 첫 글 쓰기
              </Link>
            }
          />
        </div>
      ) : (
        <>
          <ul className="mt-8 flex flex-col gap-3">
            {posts.map((post) => (
              <li key={post.id} className={rowCard}>
                <div className="flex min-w-0 flex-1 items-center gap-4">
                  <Thumb
                    src={post.thumbnailUrl}
                    fit="cover"
                    fallback={<span className="text-lg sm:text-xl">{monogram(post.title)}</span>}
                    className="h-16 w-16 sm:h-[72px] sm:w-[72px]"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-white/40">
                      <PostStatusBadge status={post.status} />
                      <time dateTime={post.publishedAt ?? post.createdAt}>
                        {formatDate(post.publishedAt ?? post.createdAt)}
                      </time>
                    </div>
                    <h2 className="mt-1.5 truncate text-[15px] font-semibold tracking-[-0.02em] text-white sm:text-base">
                      {post.title}
                    </h2>
                    {post.summary ? (
                      <p className="mt-1 truncate text-sm text-white/45">{post.summary}</p>
                    ) : null}
                  </div>
                </div>

                <div className="flex items-center gap-1 border-t border-white/[0.06] pt-3 sm:border-0 sm:pt-0 sm:pl-2">
                  <Link href={`/member/posts/${post.id}/edit`} className={rowAction}>
                    수정
                  </Link>
                  {post.status === 'PUBLISHED' ? (
                    <Link href={`/blog/${post.slug}`} className={rowAction}>
                      공개 글 <span aria-hidden>↗</span>
                    </Link>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => void handleDelete(post)}
                    disabled={deletingId === post.id}
                    className={`ml-auto sm:ml-1 ${dangerGhostButton}`}
                  >
                    {deletingId === post.id ? '삭제 중…' : '삭제'}
                  </button>
                </div>
              </li>
            ))}
          </ul>

          {data && data.totalPages > 1 ? (
            <nav
              aria-label="내 글 페이지"
              className="mt-10 flex items-center justify-center gap-4 text-sm"
            >
              <button
                type="button"
                disabled={data.first || loading}
                onClick={() => setPage((current) => current - 1)}
                className="min-h-11 rounded-full border border-white/15 px-4 text-white/65 disabled:opacity-30"
              >
                이전
              </button>
              <span className="text-white/45 tabular-nums">
                {page + 1} / {data.totalPages}
              </span>
              <button
                type="button"
                disabled={data.last || loading}
                onClick={() => setPage((current) => current + 1)}
                className="min-h-11 rounded-full border border-white/15 px-4 text-white/65 disabled:opacity-30"
              >
                다음
              </button>
            </nav>
          ) : null}
        </>
      )}
    </div>
  );
}
