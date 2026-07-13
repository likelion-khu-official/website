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
    <div className="flex flex-col items-center gap-4 text-center">
      <span
        className="text-accent leading-none"
        style={{ ...gremlin, fontSize: 'clamp(28px, 3vw, 48px)', letterSpacing: '-0.5px' }}
      >
        {month.m}
      </span>
      <div
        className="flex flex-col gap-1 text-white"
        style={{ fontSize: 'clamp(13px, 1.05vw, 20px)', letterSpacing: '-0.5px', lineHeight: 1.35 }}
      >
        {month.lines.map((line, i) => (
          <div key={i} className="relative">
            {month.highlight && i === 0 && (
              <span
                aria-hidden
                className="absolute left-[-6px] top-1/2 -translate-y-1/2 h-[1.9em] w-[320%] rounded-[3px]"
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
    <div className="relative">
      {/* 타임라인 라인 + 끝점 */}
      <div
        className="absolute top-0 h-[2px] bg-accent"
        style={isTop ? { left: 0, right: '35%' } : { left: '35%', right: 0 }}
      />
      <div
        className="absolute top-0 h-[13px] w-[13px] -translate-y-1/2 rounded-full bg-accent"
        style={isTop ? { left: 'calc(65% - 6.5px)' } : { left: 'calc(35% - 6.5px)' }}
      />
      {/* 월 그리드 */}
      <div
        className={`mt-9 grid grid-cols-6 gap-x-3 w-[59%] ${isTop ? 'mr-auto' : 'ml-auto'}`}
        style={isTop ? { marginLeft: '5%' } : { marginRight: '5%' }}
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
      className="plan-bg relative min-h-screen w-full flex flex-col items-center justify-center gap-16 px-6 py-24 overflow-hidden"
    >
      {/* 헤더 */}
      <div className="relative flex flex-col items-center gap-4 text-center">
        <p
          className="text-muted"
          style={{ fontSize: 'clamp(22px, 2.3vw, 40px)', letterSpacing: '-1.6px' }}
        >
          멋쟁이 사자처럼
        </p>
        <p
          className="text-accent font-semibold"
          style={{ fontSize: 'clamp(22px, 2.8vw, 48px)', letterSpacing: '-1.92px' }}
        >
          연간 활동 계획
        </p>
      </div>

      <div className="relative w-full max-w-[1417px] flex flex-col gap-24 mt-8">
        <Timeline months={firstHalf} side="top" />
        <Timeline months={secondHalf} side="bottom" />
      </div>
    </section>
  );
}
