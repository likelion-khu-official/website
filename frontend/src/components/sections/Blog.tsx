import Link from 'next/link';
import PostCard from '@/components/blog/PostCard';
import { getPosts } from '@/lib/feedApi';
import { getBaseUrl } from '@/lib/serverBaseUrl';

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
        <div className="grid gap-8 border-b border-white/10 pb-8 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-accent">
              Our stories
            </p>
            <h2 className="mt-5 max-w-4xl break-keep text-[clamp(38px,5.5vw,76px)] font-semibold leading-[1.02] tracking-[-0.06em] text-white">
              배운 것을 다음 경험으로
            </h2>
            <p className="mt-6 max-w-xl break-keep text-base leading-7 text-white/50 sm:text-lg">
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
          <div className="mt-8 grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3 xl:gap-x-8">
            {posts.map((post, index) => (
              <PostCard key={post.id} post={post} priority={index < 3} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
