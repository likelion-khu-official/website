export type Post = {
  title: string;
  author: string;
  date: string;
  thumbnail?: string;
};

// 기본 4개 — 나중에 항목을 추가하면 자동으로 슬라이드 루프에 포함된다.
export const DEFAULT_POSTS: Post[] = [
  { title: '제목', author: '이름', date: '날짜' },
  { title: '제목', author: '이름', date: '날짜' },
  { title: '제목', author: '이름', date: '날짜' },
  { title: '제목', author: '이름', date: '날짜' },
];

const CARD =
  'rounded-[20px] border border-[rgba(255,80,0,0.22)] bg-[rgba(18,18,18,0.72)] backdrop-blur-[6px]';

function BlogCard({ post }: { post: Post }) {
  return (
    <article className={`${CARD} flex gap-6 sm:gap-8 p-5 sm:p-6 mb-8 h-[var(--blog-card-h)] shrink-0`}>
      {/* 썸네일 */}
      <div className="h-full aspect-[16/9] shrink-0 rounded-[14px] bg-gradient-to-br from-[#4a4a4a] to-[#2c2c2c]" />

      {/* 텍스트 */}
      <div className="flex flex-1 flex-col justify-between py-1">
        <p
          className="text-white font-bold"
          style={{ fontSize: 'clamp(18px, 1.6vw, 30px)', letterSpacing: '-0.8px' }}
        >
          {post.title}
        </p>
        <p
          className="text-accent font-medium"
          style={{ fontSize: 'clamp(12px, 0.9vw, 16px)', letterSpacing: '-0.4px' }}
        >
          {post.author} / {post.date}
        </p>
      </div>
    </article>
  );
}

export default function Blog({ posts = DEFAULT_POSTS }: { posts?: Post[] }) {
  // 이어붙인 사본으로 이음매 없는 세로 무한 슬라이드. 개수에 비례해 속도 유지.
  const duration = `${Math.max(posts.length, 1) * 4}s`;

  return (
    <section
      id="blog"
      className="blog-bg relative min-h-screen w-full flex flex-col items-center justify-center gap-16 px-6 py-24 overflow-hidden"
    >
      {/* 헤더 */}
      <div className="relative flex flex-col items-center gap-4 text-center">
        <p
          className="text-white"
          style={{ fontSize: 'clamp(22px, 2.3vw, 40px)', letterSpacing: '-1.6px' }}
        >
          멋쟁이 사자처럼 블로그
        </p>
        <p
          className="text-accent font-semibold"
          style={{ fontSize: 'clamp(22px, 2.8vw, 48px)', letterSpacing: '-1.92px' }}
        >
          동아리 활동 속에서 얻은 인사이트를 기록합니다.
        </p>
      </div>

      {/* 고정 높이 뷰포트 — 카드는 이 칸 '안에서만' 슬라이드된다(페이지 높이 불변) */}
      <div
        className="blog-viewport group relative w-[82%] max-w-[1417px] overflow-hidden"
        style={
          {
            '--blog-card-h': 'clamp(150px, 19vw, 220px)',
            height: 'clamp(420px, 56vh, 620px)',
          } as React.CSSProperties
        }
      >
        <div className="blog-track flex flex-col" style={{ animationDuration: duration }}>
          {/* 원본 + 사본(2벌) → -50% 이동 시 이음매 없이 반복 */}
          {[...posts, ...posts].map((post, i) => (
            <BlogCard key={i} post={post} />
          ))}
        </div>

        {/* 위·아래 페이드로 칸 경계에서 자연스럽게 사라지게 */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-background to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-background to-transparent" />
      </div>
    </section>
  );
}
