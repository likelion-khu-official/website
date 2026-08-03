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
      className="introduce-bg relative flex w-full flex-col items-center justify-center overflow-x-clip px-5 py-20 sm:px-8 sm:py-32 lg:py-36"
    >
      {/* Likelion at KHU 워드마크 — 브랜드(Likelion)를 로고와 함께 위쪽 강조 라인에 둔다. */}
      <div className="scroll-reveal flex flex-col items-center gap-1.5" style={gremlin}>
        <div className="flex items-end gap-1.5">
          <span
            aria-hidden
            className="block"
            style={{
              height: 'clamp(30px, 3.2vw, 46px)',
              width: 'clamp(38px, 4vw, 58px)',
              backgroundColor: 'var(--accent)',
              filter: 'drop-shadow(0 0 22px rgba(255, 80, 0, 0.35))',
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
            style={{ fontSize: 'clamp(30px, 3.2vw, 46px)', letterSpacing: '-1.15px' }}
          >
            Likelion
          </p>
        </div>
        <p
          className="leading-none"
          style={{ fontSize: 'clamp(20px, 2.2vw, 32px)', letterSpacing: '-0.87px' }}
        >
          <span className="text-white/40">at&nbsp;</span>
          <span className="text-white">KHU</span>
        </p>
      </div>

      {/* 핵심 메시지 — 시간에 따라 사라지지 않고, 사용자의 스크롤 흐름 안에서 순서대로 읽힌다. */}
      <div className="mt-[clamp(36px,5vh,64px)] grid w-full max-w-[1180px] gap-8 md:grid-cols-2 md:gap-12">
        <article className="scroll-reveal scroll-reveal--left relative border-t border-white/12 pt-5 md:pt-7">
          <span aria-hidden className="absolute left-0 top-0 h-px w-14 bg-accent" />
          <p className="landing-section-kicker">Learn together</p>
          <p
            className="mt-5 text-balance break-keep text-white"
            style={{
              fontFamily: 'var(--font-korean)',
              fontSize: 'clamp(20px, 2.3vw, 34px)',
              fontWeight: 700,
              letterSpacing: '-0.01em',
              lineHeight: 1.42,
            }}
          >
            <span className="text-accent">코딩이 처음이더라도</span>
            <br />
            개발부터 기획·디자인까지
            <br />
            함께 성장합니다.
          </p>
        </article>
        <article className="scroll-reveal scroll-reveal--right relative border-t border-white/12 pt-5 md:pt-7">
          <span aria-hidden className="absolute left-0 top-0 h-px w-14 bg-accent" />
          <p className="landing-section-kicker">Build for real</p>
          <p
            className="mt-5 text-balance break-keep text-white"
            style={{
              fontFamily: 'var(--font-korean)',
              fontSize: 'clamp(20px, 2.3vw, 34px)',
              fontWeight: 700,
              letterSpacing: '-0.01em',
              lineHeight: 1.42,
            }}
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
            className={`group flex min-w-0 flex-col items-center gap-2 px-2 text-center sm:gap-2.5 sm:px-5 ${
              i % 2 === 1 ? 'border-l border-white/10' : ''
            } ${i > 0 ? 'lg:border-l lg:border-white/10' : ''}`}
          >
            <p
              className="break-keep font-medium text-[#c7c7c7]"
              style={{
                fontFamily: 'var(--font-korean)',
                fontSize: 'clamp(12px, 3.4vw, 22px)',
                letterSpacing: '-0.01em',
              }}
            >
              {s.label}
            </p>
            <p
              className="flex items-baseline justify-center leading-none whitespace-nowrap font-semibold"
              style={{ fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums' }}
            >
              <span
                className="text-accent"
                style={{
                  fontSize: 'clamp(26px, 8.5vw, 60px)',
                  letterSpacing: '-0.03em',
                  textShadow: '0 0 34px rgba(255, 80, 0, 0.28)',
                }}
              >
                <CountUp end={s.value} />
              </span>
              <span
                className={s.super ? 'ml-0.5 self-start text-[#bbbbbb]' : 'ml-1 text-accent'}
                style={{
                  fontSize: s.super ? 'clamp(15px, 4vw, 32px)' : 'clamp(26px, 8.5vw, 60px)',
                  letterSpacing: '-0.03em',
                  textShadow: s.super ? undefined : '0 0 34px rgba(255, 80, 0, 0.28)',
                }}
              >
                {s.suffix}
              </span>
            </p>
            <span
              aria-hidden
              className="mt-1 h-0.5 w-6 rounded-full bg-accent/45 transition-all duration-300 group-hover:w-10 group-hover:bg-accent"
            />
          </div>
        ))}
      </div>
    </section>
  );
}
