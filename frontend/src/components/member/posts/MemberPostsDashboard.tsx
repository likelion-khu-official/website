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
import { dangerGhostButton, listCard, primaryButton, secondaryButton } from '@/components/member/ui/styles';

const PAGE_SIZE = 24;
const MEDIA_PLACEHOLDER =
  'bg-[radial-gradient(circle_at_72%_18%,rgba(255,80,0,0.16),transparent_46%),linear-gradient(150deg,#242424,#131313)]';

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
        <div className="mt-10 grid gap-6 sm:grid-cols-2">
          {[0, 1].map((item) => (
            <Skeleton key={item} className="h-80" />
          ))}
        </div>
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
          <ul className="mt-10 grid gap-6 sm:grid-cols-2">
            {posts.map((post) => (
              <li key={post.id} className={listCard}>
                <div className={`relative aspect-[16/9] w-full overflow-hidden ${MEDIA_PLACEHOLDER}`}>
                  {post.thumbnailUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={post.thumbnailUrl}
                      alt=""
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03] motion-reduce:transform-none"
                    />
                  ) : null}
                  <div className="absolute left-4 top-4">
                    <PostStatusBadge status={post.status} />
                  </div>
                </div>

                <div className="flex flex-1 flex-col p-5">
                  <span className="text-xs text-white/35">
                    {formatDate(post.publishedAt ?? post.createdAt)}
                  </span>
                  <h2 className="mt-2 line-clamp-2 break-words text-lg font-semibold leading-tight tracking-[-0.03em] text-white">
                    {post.title}
                  </h2>
                  {post.summary ? (
                    <p className="mt-2 line-clamp-2 text-sm leading-6 text-white/45">{post.summary}</p>
                  ) : null}

                  <div className="mt-5 flex items-center gap-1 border-t border-white/10 pt-3">
                    <Link href={`/member/posts/${post.id}/edit`} className={`${secondaryButton} px-4`}>
                      수정
                    </Link>
                    {post.status === 'PUBLISHED' ? (
                      <Link
                        href={`/blog/${post.slug}`}
                        className="inline-flex min-h-11 items-center rounded-full px-3 text-sm text-white/45 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                      >
                        공개 글 보기 ↗
                      </Link>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => void handleDelete(post)}
                      disabled={deletingId === post.id}
                      className={`ml-auto ${dangerGhostButton}`}
                    >
                      {deletingId === post.id ? '삭제 중…' : '삭제'}
                    </button>
                  </div>
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
