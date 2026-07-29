const gremlin = { fontFamily: 'var(--font-gremlin-trial)' };

type Month = { m: string; lines: string[]; highlight?: boolean };

const firstHalf: Month[] = [
  { m: 'Jan', lines: ['지원기간'] },
  { m: 'Feb', lines: ['멋사 발대식'] },
  { m: 'Mar', lines: ['개강총회', '친해지길 바래'] },
  { m: 'Apr', lines: ['세션 스터디'], highlight: true },
  { m: 'May', lines: ['아이디어톤', 'MT'] },
  { m: 'Jun', lines: ['종강총회'] },
];

const secondHalf: Month[] = [
  { m: 'Jul', lines: [] },
  { m: 'Aug', lines: ['멋쟁이사자처럼', '중앙해커톤'] },
  { m: 'Sep', lines: [] },
  { m: 'Oct', lines: [] },
  { m: 'Nov', lines: [] },
  { m: 'Dec', lines: ['권역별 / 기업별', '연합 해커톤'] },
];

const HIGHLIGHT =
  'linear-gradient(to right, rgba(255,80,0,0.9) 0%, rgba(255,80,0,0.5) 22%, rgba(255,80,0,0) 60%)';

function MonthCell({ month }: { month: Month }) {
  return (
    <div className="relative flex min-h-[104px] min-w-0 flex-col items-start gap-2 border-l border-accent/45 pl-4 text-left md:min-h-0 md:items-center md:gap-4 md:border-l-0 md:pl-0 md:text-center">
      <span
        aria-hidden
        className="absolute -left-[5px] top-0 h-[9px] w-[9px] rounded-full bg-accent md:hidden"
      />
      <span
        className="leading-none text-accent"
        style={{ ...gremlin, fontSize: 'clamp(24px, 2.6vw, 42px)', letterSpacing: '-0.5px' }}
      >
        {month.m}
      </span>
      <div
        className="flex min-w-0 flex-col gap-1 break-keep text-white"
        style={{ fontSize: 'clamp(13px, 1.05vw, 20px)', letterSpacing: '-0.5px', lineHeight: 1.35 }}
      >
        {month.lines.map((line, i) => (
          <div key={i} className="relative">
            {month.highlight && i === 0 && (
              <span
                aria-hidden
                className="absolute -left-1 top-1/2 h-[1.9em] w-[calc(100%+1rem)] -translate-y-1/2 rounded-[3px] md:left-[-6px] md:w-[320%]"
                style={{ background: HIGHLIGHT, zIndex: 0 }}
              />
            )}
            <p className="relative" style={{ zIndex: 1 }}>
              {line}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function Timeline({
  months,
  side,
}: {
  months: Month[];
  side: 'top' | 'bottom';
}) {
  const isTop = side === 'top';
  return (
    <div className={`scroll-reveal timeline-group relative ${isTop ? 'timeline-group--top' : 'timeline-group--bottom'}`}>
      {/* 타임라인 라인 + 끝점 */}
      <div
        className="timeline-line absolute top-0 hidden h-[2px] origin-left bg-accent md:block"
        style={isTop ? { left: 0, right: '35%' } : { left: '35%', right: 0 }}
      />
      <div
        className="timeline-endpoint absolute top-0 hidden h-[13px] w-[13px] -translate-y-1/2 rounded-full bg-accent md:block"
        style={isTop ? { left: 'calc(65% - 6.5px)' } : { left: 'calc(35% - 6.5px)' }}
      />
      {/* 월 그리드 */}
      <div
        className={`grid grid-cols-2 gap-x-5 gap-y-7 md:mt-9 md:w-[59%] md:grid-cols-6 md:gap-x-3 md:gap-y-0 ${
          isTop ? 'md:ml-[5%] md:mr-auto' : 'md:ml-auto md:mr-[5%]'
        }`}
      >
        {months.map((month) => (
          <MonthCell key={month.m} month={month} />
        ))}
      </div>
    </div>
  );
}

export default function Plan() {
  return (
    <section
      id="plan"
      className="plan-bg relative flex min-h-screen min-h-[100svh] w-full flex-col items-center justify-center gap-12 overflow-hidden px-5 py-20 sm:px-8 sm:py-24 md:gap-16"
    >
      {/* 헤더 */}
      <div className="scroll-reveal relative flex flex-col items-center gap-4 text-center">
        <p
          className="text-muted"
          style={{ fontSize: 'clamp(22px, 2.3vw, 40px)', letterSpacing: '-1.6px' }}
        >
          멋쟁이 사자처럼
        </p>
        <p
          className="text-balance break-keep font-semibold text-accent"
          style={{ fontSize: 'clamp(22px, 2.8vw, 48px)', letterSpacing: '-1.92px' }}
        >
          연간 활동 계획
        </p>
      </div>

      <div className="relative mt-4 flex w-full max-w-[1417px] flex-col gap-14 md:mt-8 md:gap-24">
        <Timeline months={firstHalf} side="top" />
        <Timeline months={secondHalf} side="bottom" />
      </div>
    </section>
  );
}
