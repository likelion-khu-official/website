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
      className="introduce-bg relative flex min-h-screen min-h-[100svh] w-full flex-col items-center justify-center overflow-hidden px-5 py-20 sm:px-8 sm:py-24"
    >
      {/* KHU at Likelion 로고 블록 */}
      <div className="flex flex-col items-center gap-1" style={gremlin}>
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

      {/* 헤드라인 — 두 문구가 번갈아 크로스페이드 전환 */}
      <div
        className="relative min-h-32 w-full max-w-[960px] text-center sm:min-h-28"
        style={{
          marginTop: 'clamp(36px, 5vh, 72px)',
        }}
      >
        <p
          className="headline-swap headline-swap--a text-balance break-keep font-semibold text-white"
          style={{ fontSize: 'clamp(22px, 2.5vw, 36px)', letterSpacing: '-0.9px', lineHeight: 1.5 }}
        >
          <span className="inline-block text-accent">코딩이 처음이더라도</span>{' '}
          <span className="inline-block">프론트·백엔드 개발부터</span>
          <br className="hidden sm:block" />
          <span className="inline-block">기획·디자인까지</span>{' '}
          <span className="inline-block">함께 성장하는</span>
        </p>
        <p
          className="headline-swap headline-swap--b text-balance break-keep font-semibold text-white"
          style={{ fontSize: 'clamp(22px, 2.5vw, 36px)', letterSpacing: '-0.9px', lineHeight: 1.5 }}
        >
          <span className="text-accent">아이디어</span>를
          <br />
          실제로 만들어내는 경험
        </p>
      </div>

      {/* 통계 카드 */}
      <div
        className="grid w-full max-w-[1417px] grid-cols-2 items-start gap-x-4 gap-y-10 rounded-[20px] bg-[rgba(0,0,0,0.13)] px-4 py-9 backdrop-blur-[22px] sm:w-[90%] sm:px-8 sm:py-12 lg:w-[82%] lg:grid-cols-4 lg:px-[clamp(24px,3vw,60px)] lg:py-[clamp(36px,5vh,64px)]"
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
