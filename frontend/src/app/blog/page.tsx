import type { Metadata } from 'next';
import { getPosts } from '@/lib/feedApi';
import { getBaseUrl } from '@/lib/serverBaseUrl';
import PostCard from '@/components/blog/PostCard';
import Pagination from '@/components/blog/Pagination';

export const metadata: Metadata = {
  title: '블로그 — 멋쟁이사자처럼 경희대',
  description: '동아리 활동 속에서 얻은 인사이트를 기록합니다.',
};

export default async function BlogPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page: pageParam } = await searchParams;
  const parsed = Number(pageParam);
  const page = Number.isInteger(parsed) && parsed >= 0 ? parsed : 0;

  const baseUrl = await getBaseUrl();
  const { content, number, totalElements, totalPages, first, last } = await getPosts(
    page,
    baseUrl,
  );
  const featuredPost = number === 0 ? content[0] : null;
  const remainingPosts = featuredPost ? content.slice(1) : content;

  return (
    <main className="relative mx-auto min-h-[calc(100svh-88px)] w-full min-w-0 max-w-[1440px] overflow-hidden px-5 pb-24 pt-8 sm:px-10 sm:pb-28 sm:pt-10 lg:px-16 lg:pt-14">
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-[-400px] -z-0 h-[780px] w-[1050px] -translate-x-1/2 rounded-full bg-[radial-gradient(ellipse,rgba(176,34,12,0.33),rgba(19,19,19,0)_68%)] blur-2xl"
      />

      <header className="relative z-[1] min-w-0 max-w-4xl">
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-accent">
          KHU Likelion Journal
        </p>
        <h1 className="break-keep break-words text-[clamp(36px,5.5vw,68px)] font-semibold leading-[1.02] tracking-[-0.055em] text-white">
          부딪히며 배운 것을
          <br />
          다음 사람의 출발점으로
        </h1>
        <p className="mt-5 max-w-2xl break-keep break-words text-sm leading-6 text-white/55 sm:text-base sm:leading-7">
          프로젝트와 스터디에서 얻은 시행착오, 기술, 생각을 기록합니다. 한 사람의 경험이
          다음 사람의 더 빠른 시작이 되도록.
        </p>
      </header>

      <section className="relative z-[1] mt-12 min-w-0 border-t border-white/10 pt-6 sm:mt-16">
        <div className="mb-9 flex items-end justify-between gap-4">
          <h2 className="text-sm font-medium text-white/45">
            {number === 0 ? '최근 기록' : '전체 기록'}
          </h2>
          <span className="text-sm tabular-nums text-white/35">
            {totalElements} {totalElements === 1 ? 'story' : 'stories'}
          </span>
        </div>

        {content.length === 0 ? (
          <div className="flex min-h-72 flex-col items-center justify-center rounded-3xl border border-dashed border-white/15 px-6 text-center">
            <span className="mb-5 text-3xl text-accent/70" aria-hidden>
              ◌
            </span>
            <p className="text-lg font-semibold text-white">첫 번째 배움을 준비하고 있어요.</p>
            <p className="mt-2 text-sm text-white/45">곧 멤버들의 기록으로 이 공간을 채울게요.</p>
          </div>
        ) : (
          <>
            {featuredPost ? <PostCard post={featuredPost} featured priority /> : null}

            {remainingPosts.length > 0 ? (
              <div className={featuredPost ? 'mt-20 border-t border-white/10 pt-8' : ''}>
                {featuredPost ? (
                  <div className="mb-9 flex items-end justify-between">
                    <h2 className="text-sm font-medium text-white/45">더 많은 기록</h2>
                    <span className="text-xs uppercase tracking-[0.18em] text-white/25">
                      Explore
                    </span>
                  </div>
                ) : null}
                <div className="grid grid-cols-1 gap-x-6 gap-y-14 sm:grid-cols-2 lg:grid-cols-3 xl:gap-x-8 xl:gap-y-20">
                  {remainingPosts.map((post, index) => (
                    <PostCard key={post.id} post={post} priority={index < 3} />
                  ))}
                </div>
              </div>
            ) : null}
          </>
        )}

        <Pagination page={number} totalPages={totalPages} first={first} last={last} />
      </section>
    </main>
  );
}
