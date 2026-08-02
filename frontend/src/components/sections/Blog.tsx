import Link from 'next/link';
import type { PostSummary } from '@shared/types/feed';
import PostAuthor from '@/components/blog/PostAuthor';
import StoryThumbnail from '@/components/blog/StoryThumbnail';
import { getPosts } from '@/lib/feedApi';
import { getBaseUrl } from '@/lib/serverBaseUrl';

function StoryRow({ post }: { post: PostSummary }) {
  return (
    <Link
      href={`/blog/${post.slug}`}
      aria-label={`${post.title} 글 읽기`}
      className="group grid min-h-[144px] min-w-0 grid-cols-[minmax(0,1fr)_80px] items-center gap-5 border-b border-white/12 py-5 text-left outline-none transition-colors hover:bg-white/[0.025] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent sm:min-h-[152px] sm:grid-cols-[minmax(0,1fr)_96px] sm:gap-7 lg:min-h-[158px] lg:px-7"
    >
      <div className="min-w-0">
        <h3 className="line-clamp-2 break-keep text-[18px] font-semibold leading-[1.3] tracking-[-0.03em] text-white transition-colors group-hover:text-accent sm:text-[21px] lg:text-[22px]">
          {post.title}
        </h3>
        <div className="mt-4"><PostAuthor post={post} compact /></div>
      </div>
      <div className="overflow-hidden rounded-[9px] opacity-75 transition-opacity group-hover:opacity-100"><StoryThumbnail post={post} /></div>
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
      className="blog-bg relative flex min-h-screen min-h-[100svh] flex-col justify-center overflow-hidden px-5 py-24 sm:px-10 sm:py-28 lg:px-16"
    >
      <div className="scroll-reveal relative mx-auto w-full max-w-[1440px]">
        <div className="grid lg:grid-cols-[minmax(300px,0.82fr)_minmax(0,1.18fr)] lg:gap-12">
          <header className="pb-9 sm:pb-10 lg:min-h-[474px] lg:py-1">
            <div>
              <p className="landing-section-kicker">Blog</p>
              <h2 className="mt-4 max-w-[430px] break-keep text-[32px] font-semibold leading-[1.17] tracking-[-0.04em] text-white sm:text-[39px] lg:text-[44px]">
                멤버들이 나누는 기술과 경험
              </h2>
              <p className="mt-5 max-w-sm break-keep text-sm leading-6 text-white/42 sm:text-[15px] sm:leading-7">
                프로젝트와 스터디에서 배운 기술과 경험을 나눕니다.
              </p>
            </div>
            <Link
              href="/blog"
              aria-label="블로그 전체 보기"
              className="group mt-10 inline-flex min-h-11 w-fit items-center gap-3 rounded-full border border-accent/55 bg-accent/[0.1] px-5 py-2.5 text-[13px] font-semibold text-white/88 outline-none transition-colors hover:border-accent hover:bg-accent hover:text-black focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              블로그 전체 보기
              <span aria-hidden className="text-accent transition-transform group-hover:translate-x-1">→</span>
            </Link>
          </header>

          {posts === null ? (
          <div className="flex min-h-64 items-center justify-center border-t border-white/10 px-6 text-center lg:min-h-[474px]">
            <p className="text-sm text-white/45">
              블로그 글을 불러오지 못했어요. 잠시 후 다시 만나요.
            </p>
          </div>
        ) : posts.length === 0 ? (
          <div className="flex min-h-64 flex-col items-center justify-center border-t border-dashed border-white/15 px-6 text-center lg:min-h-[474px]">
            <p className="text-lg font-semibold text-white">아직 게시된 글이 없어요.</p>
            <p className="mt-2 text-sm text-white/40">곧 멤버들의 첫 블로그 글을 만날 수 있어요.</p>
          </div>
        ) : (
          <div className="border-t border-white/12">
            {posts.map((post) => <StoryRow key={post.id} post={post} />)}
          </div>
        )}
        </div>
      </div>
    </section>
  );
}
