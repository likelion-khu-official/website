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
      className="introduce-bg relative flex min-h-screen min-h-[100svh] w-full flex-col items-center justify-center overflow-hidden px-5 py-24 sm:px-8 sm:py-28 lg:py-36"
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
      <div className="mt-[clamp(44px,7vh,88px)] grid w-full max-w-[1180px] gap-8 md:grid-cols-2 md:gap-12">
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

      {/* 통계 카드 */}
      <div
        className="scroll-reveal scroll-reveal--scale grid w-full max-w-[1417px] grid-cols-2 items-start gap-x-4 gap-y-10 rounded-[20px] border border-white/[0.05] bg-[rgba(0,0,0,0.13)] px-4 py-9 backdrop-blur-[22px] sm:w-[90%] sm:px-8 sm:py-12 lg:w-[82%] lg:grid-cols-4 lg:px-[clamp(24px,3vw,60px)] lg:py-[clamp(36px,5vh,64px)]"
        style={{ marginTop: 'clamp(48px, 8vh, 108px)' }}
      >
        {stats.map((s) => (
          <div key={s.label} className="flex min-w-0 flex-col items-center gap-3 text-center">
            <p
              className="break-keep font-medium text-[#cdcdcd]"
              style={{ fontSize: 'clamp(14px, 1.9vw, 28px)', letterSpacing: '-0.7px' }}
            >
              {s.label}
            </p>
            <p className="leading-none whitespace-nowrap font-semibold">
              <span
                className="text-accent"
                style={{ fontSize: 'clamp(38px, 6vw, 86px)', letterSpacing: '-2.15px' }}
              >
                <CountUp end={s.value} />
              </span>
              <span
                className="text-[#bbbbbb]"
                style={{
                  fontSize: s.super ? 'clamp(28px, 4.4vw, 64px)' : 'clamp(20px, 2.8vw, 40px)',
                  letterSpacing: s.super ? '-1.6px' : '-1px',
                  verticalAlign: s.super ? 'top' : 'baseline',
                  marginLeft: '2px',
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
