import Link from 'next/link';
import type { PostSummary } from '@shared/types/feed';
import PostAuthor from '@/components/blog/PostAuthor';
import { getPosts } from '@/lib/feedApi';
import { getBaseUrl } from '@/lib/serverBaseUrl';

function StoryThumbnail({ post }: { post: PostSummary }) {
  return (
    <div className="aspect-[4/3] w-full overflow-hidden rounded-[14px] bg-[#202020]">
      {post.thumbnailUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={post.thumbnailUrl}
          alt=""
          className="h-full w-full object-cover transition duration-500 ease-out group-hover:scale-[1.035]"
        />
      ) : (
        <div className="flex h-full items-end bg-[radial-gradient(circle_at_75%_20%,rgba(255,80,0,0.26),transparent_38%),linear-gradient(145deg,#272727,#171717)] p-3 sm:p-5">
          <span className="text-[10px] font-semibold tracking-[0.16em] text-white/25 sm:text-xs">STORY</span>
        </div>
      )}
    </div>
  );
}

function StoryRow({ post }: { post: PostSummary }) {
  return (
    <Link
      href={`/blog/${post.slug}`}
      aria-label={`${post.title} 글 읽기`}
      className="group grid min-w-0 grid-cols-[minmax(0,1fr)_96px] items-center gap-4 border-b border-white/10 py-5 outline-none transition-colors hover:border-accent/45 focus-visible:ring-2 focus-visible:ring-accent sm:grid-cols-[minmax(0,1fr)_180px] sm:gap-7 sm:py-6 lg:grid-cols-[minmax(0,1fr)_240px] lg:gap-10"
    >
      <div className="min-w-0">
        <div className="flex items-start gap-4">
          <h3 className="line-clamp-2 min-w-0 flex-1 break-keep text-xl font-semibold leading-[1.3] tracking-[-0.035em] text-white transition-colors group-hover:text-accent sm:text-[26px] lg:text-[30px]">
            {post.title}
          </h3>
          <span
            aria-hidden
            className="mt-0.5 hidden size-9 shrink-0 items-center justify-center rounded-full border border-white/15 text-sm text-white/45 transition group-hover:border-accent group-hover:bg-accent group-hover:text-white sm:inline-flex"
          >
            ↗
          </span>
        </div>
        {post.summary ? (
          <p className="mt-2 hidden line-clamp-2 max-w-3xl break-keep text-sm leading-6 text-white/45 sm:block">
            {post.summary}
          </p>
        ) : null}
        <div className="mt-4">
          <PostAuthor post={post} compact />
        </div>
      </div>
      <StoryThumbnail post={post} />
    </Link>
  );
}

export default async function Blog() {
  let posts = null;

  try {
    posts = (await getPosts(0, await getBaseUrl())).content.slice(0, 3);
  } catch {
    // 랜딩 전체를 깨지 않고 이 섹션에서만 조회 실패 상태를 보여준다.
  }

  return (
    <section
      id="blog"
      className="blog-bg relative flex min-h-screen min-h-[100svh] flex-col justify-center overflow-hidden px-5 pb-12 pt-24 sm:px-10 sm:pb-16 sm:pt-28 lg:px-16 lg:pb-8 lg:pt-24"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-[-380px] h-[760px] w-[1050px] -translate-x-1/2 rounded-full bg-[radial-gradient(ellipse,rgba(176,34,12,0.3),rgba(19,19,19,0)_68%)] blur-2xl"
      />

      <div className="scroll-reveal relative mx-auto w-full max-w-[1440px]">
        <div className="grid gap-6 pb-7 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
              Our stories
            </p>
            <h2 className="mt-3 max-w-4xl break-keep text-[clamp(32px,4.4vw,60px)] font-semibold leading-[1.14] tracking-[-0.055em] text-white">
              배운 것을 다음 경험으로
            </h2>
            <p className="mt-4 max-w-xl break-keep text-sm leading-6 text-white/50 sm:text-base">
              활동하며 부딪히고 배운 기술과 생각을 기록해 다음 사람의 출발점으로 남깁니다.
            </p>
          </div>
          <Link
            href="/blog"
            className="inline-flex min-h-11 w-fit items-center gap-3 rounded-full border border-white/15 px-5 py-3 text-sm font-semibold text-white transition hover:border-accent hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-[#131313]"
          >
            모든 글 <span aria-hidden>→</span>
          </Link>
        </div>

        {posts === null ? (
          <div className="mt-10 flex min-h-64 items-center justify-center rounded-3xl border border-white/10 bg-white/[0.025] px-6 text-center">
            <p className="text-sm text-white/45">
              블로그 글을 불러오지 못했어요. 잠시 후 다시 만나요.
            </p>
          </div>
        ) : posts.length === 0 ? (
          <div className="mt-10 flex min-h-64 flex-col items-center justify-center rounded-3xl border border-dashed border-white/15 px-6 text-center">
            <p className="text-lg font-semibold text-white">첫 번째 배움을 준비하고 있어요.</p>
            <p className="mt-2 text-sm text-white/40">곧 멤버들의 기록으로 이 공간을 채울게요.</p>
          </div>
        ) : (
          <div className="border-t border-white/10">
            {posts.map((post) => (
              <StoryRow key={post.id} post={post} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
