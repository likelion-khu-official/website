'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { MemberAccount } from '@shared/types/member-auth';
import type { MemberPostSummary, SpringPage } from '@shared/types/feed';
import { formatDate } from '@/lib/formatDate';
import {
  deletePost,
  getCurrentMember,
  getMemberPosts,
  MemberApiError,
} from '@/lib/memberApi';
import MemberProjectHeader from '@/components/member/projects/MemberProjectHeader';

const PAGE_PATH = '/member/posts';
const PAGE_SIZE = 24;

function sendToLogin(router: ReturnType<typeof useRouter>) {
  router.replace(`/member/login?returnTo=${encodeURIComponent(PAGE_PATH)}`);
}

function statusStyle(status: MemberPostSummary['status']) {
  if (status === 'PUBLISHED') return 'bg-emerald-400/10 text-emerald-300';
  if (status === 'HIDDEN') return 'bg-amber-400/10 text-amber-300';
  return 'bg-white/10 text-white/55';
}

function statusLabel(status: MemberPostSummary['status']) {
  if (status === 'PUBLISHED') return '공개';
  if (status === 'HIDDEN') return '숨김';
  return '초안';
}

export default function MemberPostsDashboard() {
  const router = useRouter();
  const [member, setMember] = useState<MemberAccount | null>(null);
  const [posts, setPosts] = useState<MemberPostSummary[]>([]);
  const [page, setPage] = useState(0);
  const [pageInfo, setPageInfo] = useState<Pick<
    SpringPage<MemberPostSummary>,
    'first' | 'last' | 'totalPages'
  > | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const load = useCallback(
    async (nextPage: number) => {
      setLoading(true);
      setError('');
      try {
        const [{ member: currentMember }, postPage] = await Promise.all([
          getCurrentMember(),
          getMemberPosts(nextPage, PAGE_SIZE),
        ]);
        if (currentMember.mustChangePassword) {
          sendToLogin(router);
          return;
        }
        setMember(currentMember);
        setPosts(postPage.content);
        setPage(postPage.number);
        setPageInfo({
          first: postPage.first,
          last: postPage.last,
          totalPages: postPage.totalPages,
        });
      } catch (loadError) {
        if (loadError instanceof MemberApiError && loadError.status === 401) {
          sendToLogin(router);
          return;
        }
        setError(loadError instanceof Error ? loadError.message : '내 글을 불러오지 못했어요.');
      } finally {
        setLoading(false);
      }
    },
    [router]
  );

  useEffect(() => {
    const timeout = window.setTimeout(() => void load(0), 0);
    return () => window.clearTimeout(timeout);
  }, [load]);

  async function handleDelete(post: MemberPostSummary) {
    const confirmed = window.confirm(
      `“${post.title}” 글을 삭제할까요?\n\n댓글까지 DB에서 완전히 제거되며 되돌릴 수 없습니다.`
    );
    if (!confirmed) return;

    setDeletingId(post.id);
    setError('');
    try {
      await deletePost(post.id);
      if (posts.length === 1 && page > 0) {
        await load(page - 1);
      } else {
        setPosts((current) => current.filter((item) => item.id !== post.id));
      }
    } catch (deleteError) {
      if (
        deleteError instanceof MemberApiError &&
        (deleteError.status === 401 || deleteError.code === 'MUST_CHANGE_PASSWORD')
      ) {
        sendToLogin(router);
        return;
      }
      setError(deleteError instanceof Error ? deleteError.message : '글 삭제에 실패했어요.');
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="mx-auto w-full max-w-6xl">
      <MemberProjectHeader memberName={member?.name} />

      <div className="flex flex-col gap-8 border-b border-white/10 pb-10 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-accent">
            Blog
          </p>
          <h1 className="mt-4 text-4xl font-semibold tracking-[-0.05em] text-white sm:text-6xl">
            내 글
          </h1>
          <p className="mt-4 text-sm leading-6 text-white/45">
            내가 쓴 공개·숨김 글을 확인하고 내용을 관리할 수 있어요.
          </p>
        </div>
        <Link
          href="/member/write"
          className="inline-flex min-h-11 w-fit items-center gap-2 rounded-full bg-accent px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#ff6a26] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <span aria-hidden>＋</span> 새 글
        </Link>
      </div>

      {error ? (
        <div
          role="alert"
          className="mt-8 flex flex-col items-start justify-between gap-2 rounded-2xl border border-red-400/20 bg-red-400/[0.07] px-5 py-4 text-sm text-red-200 sm:flex-row sm:items-center sm:gap-4"
        >
          <span className="min-w-0 break-words">{error}</span>
          <button
            type="button"
            onClick={() => void load(page)}
            className="inline-flex min-h-11 shrink-0 items-center rounded-md underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-200"
          >
            다시 시도
          </button>
        </div>
      ) : null}

      {loading ? (
        <div className="mt-10 grid gap-5 sm:grid-cols-2">
          {[0, 1].map((item) => (
            <div
              key={item}
              className="h-56 animate-pulse rounded-3xl border border-white/5 bg-white/[0.035]"
            />
          ))}
        </div>
      ) : posts.length === 0 ? (
        <div className="mt-10 flex min-h-72 flex-col items-center justify-center rounded-3xl border border-dashed border-white/15 px-6 text-center">
          <p className="text-lg font-semibold">아직 작성한 글이 없어요.</p>
          <p className="mt-2 text-sm text-white/40">첫 글을 작성하면 방문자에게 바로 공개돼요.</p>
        </div>
      ) : (
        <>
          <ul className="mt-10 grid gap-5 sm:grid-cols-2">
            {posts.map((post) => (
              <li
                key={post.id}
                className="group overflow-hidden rounded-3xl border border-white/10 bg-white/[0.025] transition hover:border-white/20"
              >
                <div className="flex gap-5 p-5">
                  <div className="aspect-[16/9] w-32 shrink-0 overflow-hidden rounded-2xl bg-white/[0.05]">
                    {post.thumbnailUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={post.thumbnailUrl}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full px-2 py-1 text-[10px] font-semibold ${statusStyle(post.status)}`}
                      >
                        {statusLabel(post.status)}
                      </span>
                      <span className="text-xs text-white/35">
                        {formatDate(post.publishedAt ?? post.createdAt)}
                      </span>
                    </div>
                    <h2 className="mt-3 line-clamp-2 break-words text-lg font-semibold leading-tight tracking-[-0.03em]">
                      {post.title}
                    </h2>
                    {post.summary ? (
                      <p className="mt-2 line-clamp-2 text-sm leading-5 text-white/45">
                        {post.summary}
                      </p>
                    ) : null}
                  </div>
                </div>
                <div className="grid grid-cols-2 border-t border-white/10">
                  {post.status === 'PUBLISHED' ? (
                    <Link
                      href={`/blog/${post.slug}`}
                      className="col-span-2 inline-flex min-h-11 items-center justify-center border-b border-white/10 px-5 py-3 text-center text-sm text-white/45 transition hover:bg-white/[0.05] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent"
                    >
                      공개 글 보기
                    </Link>
                  ) : null}
                  <Link
                    href={`/member/posts/${post.id}/edit`}
                    className="inline-flex min-h-11 items-center justify-center px-5 py-3.5 text-center text-sm text-white/65 transition hover:bg-white/[0.05] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent"
                  >
                    수정
                  </Link>
                  <button
                    type="button"
                    onClick={() => void handleDelete(post)}
                    disabled={deletingId === post.id}
                    className="min-h-11 border-l border-white/10 px-5 py-3.5 text-sm text-red-300/75 transition hover:bg-red-400/[0.06] hover:text-red-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-red-200 disabled:opacity-40"
                  >
                    {deletingId === post.id ? '삭제 중…' : '삭제'}
                  </button>
                </div>
              </li>
            ))}
          </ul>

          {pageInfo && pageInfo.totalPages > 1 ? (
            <nav
              aria-label="내 글 페이지"
              className="mt-10 flex items-center justify-center gap-4 text-sm"
            >
              <button
                type="button"
                disabled={pageInfo.first || loading}
                onClick={() => void load(page - 1)}
                className="min-h-11 rounded-full border border-white/15 px-4 text-white/65 disabled:opacity-30"
              >
                이전
              </button>
              <span className="text-white/45">
                {page + 1} / {pageInfo.totalPages}
              </span>
              <button
                type="button"
                disabled={pageInfo.last || loading}
                onClick={() => void load(page + 1)}
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
