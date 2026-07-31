type Track = {
  number: string;
  title: string;
  headline: string;
  description: string;
};

const tracks: Track[] = [
  {
    number: '01',
    title: 'Front-end',
    headline: '빠르게 만들고, 섬세하게 다듬습니다.',
    description:
      '아이디어를 인터랙티브한 화면으로 가장 먼저 구현합니다. 컴포넌트 설계, 반응형 UI, 접근성, API 연동을 익히고 새로운 도구를 능동적으로 활용해 완성도 높은 사용자 경험을 만듭니다.',
  },
  {
    number: '02',
    title: 'Back-end',
    headline: '보이지 않는 곳에서 서비스를 단단하게 만듭니다.',
    description:
      '데이터 모델과 API, 인증, 비즈니스 로직을 설계합니다. 기능 구현을 넘어 성능과 안정성, 운영까지 고민하며 오래 살아남는 서비스의 기반을 만듭니다.',
  },
  {
    number: '03',
    title: 'PM · Design',
    headline: '좋은 아이디어보다, 풀어야 할 문제를 먼저 찾습니다.',
    description:
      '사용자를 관찰하고 가설을 빠르게 검증해 제품의 방향을 정합니다. 기획과 UX/UI를 유연하게 오가며 팀의 생각을 누구나 이해하고 사용할 수 있는 경험으로 구체화합니다.',
  },
  {
    number: '04',
    title: 'AI',
    headline: '기술 시연을 넘어, 쓸 이유가 있는 AI를 만듭니다.',
    description:
      '데이터와 모델의 원리를 익히고 문제에 맞는 접근법을 실험합니다. 정확도만 보는 데서 멈추지 않고 실제 사용자와 서비스 맥락 속에서 유용한 AI 기능을 구현합니다.',
  },
];

function TrackMotif({ track }: { track: Track }) {
  const ringProps = {
    fill: 'none',
    stroke: '#a4a8ad',
    strokeOpacity: 0.6,
    strokeWidth: 1.2,
  };

  return (
    <svg
      aria-hidden
      viewBox="24 0 184 160"
      className="h-16 w-28 shrink-0 overflow-visible opacity-65 transition-[opacity,filter] duration-300 group-hover:opacity-100 group-hover:[filter:brightness(1.15)_drop-shadow(0_0_14px_rgba(255,80,0,0.12))] sm:h-20 sm:w-36 lg:absolute lg:right-5 lg:top-1/2 lg:h-44 lg:w-[38%] lg:max-w-[240px] lg:-translate-y-1/2"
    >
      <defs>
        <linearGradient id={`track-metal-${track.number}`} x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#9ba3ac" stopOpacity="0.75" />
          <stop offset="0.48" stopColor="#4d5258" stopOpacity="0.65" />
          <stop offset="1" stopColor="#202225" stopOpacity="0.28" />
        </linearGradient>
      </defs>

      {track.number === '01' ? (
        <>
          <circle
            cx="98"
            cy="96"
            r="48"
            fill={`url(#track-metal-${track.number})`}
            stroke="#a4a8ad"
            strokeOpacity="0.45"
          />
          <circle cx="122" cy="56" r="43" {...ringProps} />
        </>
      ) : null}

      {track.number === '02' ? (
        <>
          {[78, 88, 98, 108].map((cx) => (
            <ellipse key={cx} cx={cx} cy="80" rx="40" ry="48" {...ringProps} />
          ))}
          <circle
            cx="145"
            cy="80"
            r="48"
            fill={`url(#track-metal-${track.number})`}
            stroke="#a4a8ad"
            strokeOpacity="0.45"
          />
        </>
      ) : null}

      {track.number === '03' ? (
        <>
          <circle cx="108" cy="56" r="40" {...ringProps} />
          <circle
            cx="108"
            cy="103"
            r="40"
            fill={`url(#track-metal-${track.number})`}
            stroke="#a4a8ad"
            strokeOpacity="0.45"
          />
        </>
      ) : null}

      {track.number === '04' ? (
        <>
          {[64, 74, 84, 94, 104].map((cx) => (
            <ellipse key={cx} cx={cx} cy="80" rx="31" ry="38" {...ringProps} />
          ))}
          <circle cx="148" cy="80" r="40" {...ringProps} />
        </>
      ) : null}
    </svg>
  );
}

export default function IntroduceSession() {
  return (
    <section
      id="session"
      className="session-intro-bg relative flex min-h-screen min-h-[100svh] w-full items-center overflow-hidden px-5 py-20 sm:px-10 sm:py-24 lg:h-[100svh] lg:px-16 lg:py-16"
    >
      <div aria-hidden className="session-intro-surface absolute inset-0" />
      <div className="relative mx-auto w-full max-w-[1440px]">
        <header className="scroll-reveal grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-end lg:gap-12">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
              Our tracks
            </p>
            <h2 className="mt-3 max-w-4xl text-balance break-keep text-[clamp(34px,3.3vw,48px)] font-semibold leading-[1.1] tracking-[-0.055em] text-white lg:whitespace-nowrap">
              관심을 실력으로 바꾸는 네 개의 트랙
            </h2>
          </div>
          <p className="max-w-[360px] text-balance break-keep text-sm leading-6 text-white/50 lg:pb-0">
            각자의 분야에서 기본기를 쌓고, 서로 다른 전문성을 연결해 아이디어를
            실제 서비스로 완성합니다.
          </p>
        </header>

        <div className="mt-10 grid border-t border-white/[0.14] sm:mt-12 lg:grid-cols-2 lg:grid-rows-2 lg:border-t-0">
          {tracks.map((track, index) => (
            <article
              key={track.title}
              className={`group scroll-reveal session-card-reveal relative min-w-0 border-b border-white/[0.14] py-10 transition-colors duration-300 hover:bg-white/[0.012] sm:py-12 lg:h-[270px] lg:border-b-0 lg:px-10 lg:py-9 ${
                index % 2 === 0 ? 'lg:border-r' : ''
              } ${index < 2 ? 'lg:border-b' : 'lg:border-b-0'}`}
              style={{ '--reveal-y': `${30 + index * 8}px` } as React.CSSProperties}
            >
              <div className="flex items-center justify-between gap-6 lg:block">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
                  Track {track.number}
                </p>
                <TrackMotif track={track} />
              </div>

              <div className="mt-6 lg:max-w-[65%]">
                <h3 className="text-[clamp(30px,2.2vw,36px)] font-semibold tracking-[-0.045em] text-white">
                  {track.title}
                </h3>
                <p className="mt-3 break-keep text-[17px] font-semibold leading-[1.45] tracking-[-0.025em] text-white/90 sm:text-lg">
                  {track.headline}
                </p>
                <p className="mt-3 break-keep text-sm leading-6 text-white/48">
                  {track.description}
                </p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
