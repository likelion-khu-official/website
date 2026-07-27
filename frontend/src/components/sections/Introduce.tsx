import CountUp from '@/components/CountUp';

const gremlin = { fontFamily: 'var(--font-gremlin-trial)' };

const stats = [
  { label: '시작된 지', value: 14, suffix: '년', super: false },
  { label: '참여 대학', value: 80, suffix: '+', super: true },
  { label: '멋대 출신 학생 수', value: 14000, suffix: '+', super: true },
  { label: '누적 완성 서비스', value: 1800, suffix: '+', super: true },
];

export default function Introduce() {
  return (
    <section
      id="introduce"
      className="introduce-bg relative flex min-h-screen min-h-[100svh] w-full flex-col items-center justify-center overflow-hidden px-5 py-20 sm:px-8 sm:py-24 lg:py-24"
    >
      {/* KHU at Likelion 로고 블록 */}
      <div className="scroll-reveal flex flex-col items-center gap-1" style={gremlin}>
        <p
          className="text-white leading-none"
          style={{ fontSize: 'clamp(30px, 3.2vw, 46px)', letterSpacing: '-1.15px' }}
        >
          KHU at
        </p>
        <div className="flex items-end gap-1">
          <span
            aria-hidden
            className="block"
            style={{
              height: 'clamp(28px, 3vw, 43px)',
              width: 'clamp(36px, 3.8vw, 55px)',
              backgroundColor: 'var(--accent)',
              maskImage: 'url(/logo.png)',
              WebkitMaskImage: 'url(/logo.png)',
              maskSize: 'contain',
              WebkitMaskSize: 'contain',
              maskRepeat: 'no-repeat',
              WebkitMaskRepeat: 'no-repeat',
              maskPosition: 'center',
              WebkitMaskPosition: 'center',
            }}
          />
          <p
            className="text-accent leading-none"
            style={{ fontSize: 'clamp(22px, 2.4vw, 34.6px)', letterSpacing: '-0.87px' }}
          >
            Likelion
          </p>
        </div>
      </div>

      {/* 핵심 메시지 — 시간에 따라 사라지지 않고, 사용자의 스크롤 흐름 안에서 순서대로 읽힌다. */}
      <div className="mt-[clamp(36px,5vh,64px)] grid w-full max-w-[1180px] gap-8 md:grid-cols-2 md:gap-12">
        <article className="scroll-reveal scroll-reveal--left border-t border-white/12 pt-5 md:pt-7">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">Learn together</p>
          <p
            className="mt-5 text-balance break-keep font-semibold text-white"
            style={{ fontSize: 'clamp(22px, 2.5vw, 38px)', letterSpacing: '-0.9px', lineHeight: 1.45 }}
          >
            <span className="text-accent">코딩이 처음이더라도</span>
            <br />
            개발부터 기획·디자인까지
            <br />
            함께 성장합니다.
          </p>
        </article>
        <article className="scroll-reveal scroll-reveal--right border-t border-white/12 pt-5 md:pt-7">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">Build for real</p>
          <p
            className="mt-5 text-balance break-keep font-semibold text-white"
            style={{ fontSize: 'clamp(22px, 2.5vw, 38px)', letterSpacing: '-0.9px', lineHeight: 1.45 }}
          >
            머릿속의 <span className="text-accent">아이디어</span>를
            <br />
            실제로 작동하는 서비스로
            <br />
            만들어냅니다.
          </p>
        </article>
      </div>

      {/* 통계 카드 — 큰 수(14,000)가 옆 칸을 침범하지 않게 칸 폭에 맞춰 크기를 정하고
          열 사이에 얇은 구분선을 둬서 숫자가 붙어 읽히는 문제를 없앤다. */}
      <div
        className="scroll-reveal scroll-reveal--scale grid w-full max-w-[1240px] grid-cols-2 items-stretch gap-y-8 rounded-[22px] border border-white/[0.06] bg-[rgba(0,0,0,0.18)] px-2 py-9 backdrop-blur-[22px] sm:w-[92%] sm:px-4 sm:py-11 lg:w-[86%] lg:grid-cols-4 lg:py-[clamp(34px,4.5vh,56px)]"
        style={{ marginTop: 'clamp(44px, 7vh, 96px)' }}
      >
        {stats.map((s, i) => (
          <div
            key={s.label}
            className={`flex min-w-0 flex-col items-center gap-2.5 px-3 text-center sm:px-5 ${
              i % 2 === 1 ? 'border-l border-white/10' : ''
            } ${i > 0 ? 'lg:border-l lg:border-white/10' : ''}`}
          >
            <p
              className="break-keep font-medium text-[#c7c7c7]"
              style={{ fontSize: 'clamp(13px, 1.5vw, 22px)', letterSpacing: '-0.5px' }}
            >
              {s.label}
            </p>
            <p className="flex items-baseline justify-center leading-none whitespace-nowrap font-semibold">
              <span
                className="text-accent"
                style={{ fontSize: 'clamp(34px, 4.4vw, 60px)', letterSpacing: '-1.8px' }}
              >
                <CountUp end={s.value} />
              </span>
              <span
                className="ml-0.5 self-start text-[#bbbbbb]"
                style={{
                  fontSize: s.super ? 'clamp(20px, 2.4vw, 32px)' : 'clamp(17px, 2vw, 26px)',
                  letterSpacing: '-0.8px',
                }}
              >
                {s.suffix}
              </span>
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
