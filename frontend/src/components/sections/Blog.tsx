import Link from 'next/link';
import type { PostSummary } from '@shared/types/feed';
import PostAuthor from '@/components/blog/PostAuthor';
import StoryThumbnail from '@/components/blog/StoryThumbnail';
import { getPosts } from '@/lib/feedApi';
import { getBaseUrl } from '@/lib/serverBaseUrl';

function StoryRow({ post, index }: { post: PostSummary; index: number }) {
  return (
    <Link
      href={`/blog/${post.slug}`}
      aria-label={`${post.title} 글 읽기`}
      className="group grid grid-cols-[26px_minmax(0,1fr)_44px] items-center gap-4 border-t border-white/12 py-6 text-left outline-none transition-colors hover:bg-white/[0.02] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent sm:grid-cols-[44px_minmax(0,1fr)_auto] sm:gap-7 sm:py-7 lg:px-7"
    >
      {/* 에디토리얼 인덱스 번호 — FAQ와 같은 스캔 리듬을 준다. */}
      <span className="self-start pt-1 text-[12px] font-medium tabular-nums tracking-[0.12em] text-white/28 transition-colors group-hover:text-accent/85 sm:text-[13px]">
        {String(index + 1).padStart(2, '0')}
      </span>

      <div className="min-w-0">
        <h3 className="line-clamp-2 break-keep text-[18px] font-semibold leading-[1.32] tracking-[-0.03em] text-white transition-colors group-hover:text-accent sm:text-[22px] lg:text-[23px]">
          {post.title}
        </h3>
        {post.summary ? (
          <p className="mt-2 hidden line-clamp-1 break-keep text-[14px] leading-6 text-white/42 sm:block">
            {post.summary}
          </p>
        ) : null}
        <div className="mt-3 sm:mt-4">
          <PostAuthor post={post} compact />
        </div>
      </div>

      {/* 썸네일(데스크탑에서만)과 원형 화살표 어포던스를 한 묶음으로 우측에 정렬. */}
      <div className="flex items-center gap-5 sm:gap-6">
        <div className="hidden w-[122px] shrink-0 overflow-hidden rounded-[10px] opacity-80 transition-opacity duration-300 group-hover:opacity-100 sm:block lg:w-[142px]">
          <StoryThumbnail post={post} />
        </div>
        <span
          aria-hidden
          className="flex size-11 shrink-0 items-center justify-center rounded-full border border-white/12 text-white/55 transition-[border-color,background-color,color] duration-200 group-hover:border-accent group-hover:bg-accent group-hover:text-black"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="size-4 transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none"
          >
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </span>
      </div>
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
      className="blog-bg relative flex flex-col justify-center overflow-hidden px-5 py-24 sm:px-10 sm:py-28 lg:px-16 lg:py-32"
    >
      <div className="scroll-reveal relative mx-auto w-full max-w-[1440px]">
        <div className="grid lg:grid-cols-[minmax(300px,0.82fr)_minmax(0,1.18fr)] lg:gap-12">
          <header className="pb-9 sm:pb-10 lg:flex lg:min-h-[500px] lg:flex-col lg:justify-between lg:py-1">
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
              className="group mt-10 inline-flex min-h-11 w-fit items-center gap-3 rounded-full border border-accent/55 bg-accent/[0.1] px-5 py-2.5 text-[13px] font-semibold text-white/88 outline-none transition-colors hover:border-accent hover:bg-accent hover:text-black focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background lg:mt-0"
            >
              블로그 전체 보기
              <span aria-hidden className="text-accent transition-transform group-hover:translate-x-1">
                →
              </span>
            </Link>
          </header>

          {posts === null ? (
            <div className="flex min-h-64 items-center justify-center border-t border-white/10 px-6 text-center lg:min-h-[500px]">
              <p className="text-sm text-white/45">
                블로그 글을 불러오지 못했어요. 잠시 후 다시 만나요.
              </p>
            </div>
          ) : posts.length === 0 ? (
            <div className="flex min-h-64 flex-col items-center justify-center border-t border-dashed border-white/15 px-6 text-center lg:min-h-[500px]">
              <p className="text-lg font-semibold text-white">아직 게시된 글이 없어요.</p>
              <p className="mt-2 text-sm text-white/40">곧 멤버들의 첫 블로그 글을 만날 수 있어요.</p>
            </div>
          ) : (
            <div className="border-b border-white/12">
              {posts.map((post, index) => (
                <StoryRow key={post.id} post={post} index={index} />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
