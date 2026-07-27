export default function Thumbnail() {
  return (
    <section id="thumbnail" className="hero-scroll-shell relative h-[150svh] w-full">
      <div className="hero-thumbnail-bg hero-stage sticky top-0 flex h-screen h-[100svh] w-full items-center justify-center overflow-hidden px-5 pb-12 pt-20 sm:px-8">
        <div className="hero-glow-layer hero-glow-layer--1" />
        <div className="hero-glow-layer hero-glow-layer--2">
          <div className="hero-glow-layer--2-right" />
        </div>
        <div className="hero-glow-layer hero-glow-layer--3">
          <div className="hero-glow-layer--3-topleft" />
        </div>

        <div aria-hidden className="hero-brand-mark" />

        <div className="hero-copy relative flex w-full max-w-[1480px] flex-col items-center text-center">
          <p className="text-sm tracking-[-0.3px] text-[#cdcdcd] sm:text-xl sm:tracking-[-0.64px] md:text-[28px]">
            Kyunghee Univ. Like Lions
          </p>
          <div
            className="mt-3 flex max-w-full flex-col items-center gap-1 sm:mt-4"
            style={{ fontFamily: 'var(--font-gremlin-trial)' }}
          >
            <h1 className="max-w-full whitespace-nowrap text-[clamp(36px,12vw,144px)] leading-[0.86] tracking-[-0.04em] text-white">
              Possibility
            </h1>
            <p className="text-[clamp(25px,6vw,72px)] leading-none tracking-[-0.035em] text-accent/50">
              to reality
            </p>
          </div>

          <div className="hero-support mt-8 flex flex-col items-center sm:mt-10">
            <p className="max-w-[620px] text-balance break-keep text-[clamp(15px,1.35vw,20px)] leading-7 text-white/62">
              코딩이 처음이어도, 아이디어를 실제 서비스로 만드는
              <br className="hidden sm:block" /> 경희대학교의 빌더 커뮤니티
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <a
                href="#introduce"
                className="inline-flex min-h-11 items-center gap-2 rounded-full bg-accent px-5 py-3 text-sm font-semibold text-white outline-none transition hover:bg-[#ff6a24] focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                멋사 알아보기 <span aria-hidden>↓</span>
              </a>
              <a
                href="#project"
                className="inline-flex min-h-11 items-center gap-2 rounded-full border border-white/15 bg-black/10 px-5 py-3 text-sm font-semibold text-white/75 outline-none backdrop-blur transition hover:border-white/35 hover:text-white focus-visible:ring-2 focus-visible:ring-accent"
              >
                프로젝트 보기 <span aria-hidden>↓</span>
              </a>
            </div>
          </div>
        </div>

        <a
          href="#introduce"
          aria-label="소개 섹션으로 이동"
          className="hero-scroll-cue absolute bottom-5 left-1/2 flex min-h-11 -translate-x-1/2 items-center gap-3 rounded-full px-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/45 outline-none transition-colors hover:text-white focus-visible:ring-2 focus-visible:ring-accent sm:bottom-7"
        >
          <span>Scroll to explore</span>
          <span aria-hidden className="hero-scroll-arrow text-accent">
            ↓
          </span>
        </a>
      </div>
    </section>
  );
}
