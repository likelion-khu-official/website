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
      className="introduce-bg relative min-h-screen w-full flex flex-col items-center justify-center px-6 py-24 overflow-hidden"
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
        className="relative w-full text-center"
        style={{
          marginTop: 'clamp(36px, 5vh, 72px)',
          minHeight: 'clamp(66px, 7.5vh, 108px)',
        }}
      >
        <p
          className="headline-swap headline-swap--a font-semibold text-white"
          style={{ fontSize: 'clamp(22px, 2.5vw, 36px)', letterSpacing: '-0.9px', lineHeight: 1.5 }}
        >
          <span className="text-accent">코딩이 처음이더라도</span> 프론트∙백엔드 개발부터
          <br />
          기획∙디자인까지 함께 성장하는
        </p>
        <p
          className="headline-swap headline-swap--b font-semibold text-white"
          style={{ fontSize: 'clamp(22px, 2.5vw, 36px)', letterSpacing: '-0.9px', lineHeight: 1.5 }}
        >
          <span className="text-accent">아이디어</span>를
          <br />
          실제로 만들어내는 경험
        </p>
      </div>

      {/* 통계 카드 */}
      <div
        className="w-[82%] max-w-[1417px] rounded-[20px] bg-[rgba(0,0,0,0.13)] backdrop-blur-[22px] flex items-center justify-around flex-wrap gap-y-8"
        style={{ marginTop: 'clamp(48px, 8vh, 108px)', padding: 'clamp(36px, 5vh, 64px) clamp(24px, 3vw, 60px)' }}
      >
        {stats.map((s) => (
          <div key={s.label} className="flex flex-col items-center gap-3">
            <p
              className="text-[#cdcdcd] font-medium"
              style={{ fontSize: 'clamp(16px, 1.9vw, 28px)', letterSpacing: '-0.7px' }}
            >
              {s.label}
            </p>
            <p className="leading-none whitespace-nowrap font-semibold">
              <span
                className="text-accent"
                style={{ fontSize: 'clamp(46px, 6vw, 86px)', letterSpacing: '-2.15px' }}
              >
                <CountUp end={s.value} />
              </span>
              <span
                className="text-[#bbbbbb]"
                style={{
                  fontSize: s.super ? 'clamp(34px, 4.4vw, 64px)' : 'clamp(22px, 2.8vw, 40px)',
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
