type Track = {
  number: '01' | '02' | '03' | '04';
  title: string;
  headline: string;
  descriptionLines: string[];
};

const tracks: Track[] = [
  {
    number: '01',
    title: 'Front-end',
    headline: '빠르게 만들고, 섬세하게 다듬습니다.',
    descriptionLines: [
      '아이디어를 인터랙티브한 화면으로 가장 먼저 구현합니다.',
      '컴포넌트 설계, 반응형 UI, 접근성, API 연동을 익히고',
      '새로운 도구를 능동적으로 활용해 완성도 높은 사용자',
      '경험을 만듭니다.',
    ],
  },
  {
    number: '02',
    title: 'Back-end',
    headline: '보이지 않는 곳에서 서비스를 단단하게 만듭니다.',
    descriptionLines: [
      '데이터 모델과 API, 인증, 비즈니스 로직을 설계합니다.',
      '기능 구현을 넘어 성능과 안정성, 운영까지 고민하며',
      '오래 살아남는 서비스의 기반을 만듭니다.',
    ],
  },
  {
    number: '03',
    title: 'PM · Design',
    headline: '좋은 아이디어보다, 풀어야 할 문제를 먼저 찾습니다.',
    descriptionLines: [
      '사용자를 관찰하고 가설을 빠르게 검증해 제품의 방향을 정합니다.',
      '기획과 UX/UI를 유연하게 오가며 팀의 생각을 누구나 이해하고',
      '사용할 수 있는 경험으로 구체화합니다.',
    ],
  },
  {
    number: '04',
    title: 'AI',
    headline: '기술 시연을 넘어, 쓸 이유가 있는 AI를 만듭니다.',
    descriptionLines: [
      '데이터와 모델의 원리를 익히고 문제에 맞는 접근법을 실험합니다.',
      '정확도만 보는 데서 멈추지 않고 실제 사용자와 서비스 맥락 속에서',
      '유용한 AI 기능을 구현합니다.',
    ],
  },
];

function TrackMotif({ number }: { number: Track['number'] }) {
  const ringProps = {
    fill: 'none',
    stroke: '#A4A8AD',
    strokeOpacity: 0.46,
    strokeWidth: 1,
  };

  const layout = {
    '01': ['0 0 201 126', 'session-track-motif--01'],
    '02': ['0 0 201 126', 'session-track-motif--02'],
    '03': ['0 0 182 126', 'session-track-motif--03'],
    '04': ['0 0 207 126', 'session-track-motif--04'],
  }[number];

  return (
    <svg aria-hidden viewBox={layout[0]} className={`session-track-motif ${layout[1]}`}>
      <defs>
        <linearGradient id={`track-metal-${number}`} x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#9BA3AC" stopOpacity="0.75" />
          <stop offset="0.48" stopColor="#4D5258" stopOpacity="0.65" />
          <stop offset="1" stopColor="#202225" stopOpacity="0.28" />
        </linearGradient>
      </defs>

      {number === '01' ? (
        <>
          <circle
            cx="63"
            cy="63"
            r="63"
            fill={`url(#track-metal-${number})`}
            stroke="#A4A8AD"
            strokeOpacity="0.46"
          />
          <circle cx="138" cy="63" r="63" {...ringProps} />
        </>
      ) : null}

      {number === '02' ? (
        <>
          <circle cx="63" cy="63" r="63" {...ringProps} />
          <circle
            cx="138"
            cy="63"
            r="63"
            fill={`url(#track-metal-${number})`}
            stroke="#A4A8AD"
            strokeOpacity="0.46"
          />
        </>
      ) : null}

      {number === '03' ? (
        <>
          {[
            [54, 54],
            [65, 54],
            [76.5, 53.5],
            [88, 54],
            [99, 54],
          ].map(([cx, rx]) => (
            <ellipse key={cx} cx={cx} cy="63" rx={rx} ry="63" {...ringProps} />
          ))}
          <circle
            cx="119"
            cy="63"
            r="63"
            fill={`url(#track-metal-${number})`}
            stroke="#A4A8AD"
            strokeOpacity="0.46"
          />
        </>
      ) : null}

      {number === '04' ? (
        <>
          <circle cx="63" cy="63" r="63" {...ringProps} />
          {[129, 137, 145, 153, 161, 169].map((cx) => (
            <ellipse key={cx} cx={cx} cy="63" rx="38" ry="63" {...ringProps} />
          ))}
        </>
      ) : null}
    </svg>
  );
}

function SessionBackground() {
  return (
    <svg
      aria-hidden
      className="session-intro-art"
      viewBox="0 65 1536 959"
      preserveAspectRatio="none"
    >
      <rect width="1536" height="1024" fill="#111212" />
      <path d="M1719 114H183V1138H1719V114Z" fill="url(#session-glow)" />
      <defs>
        <radialGradient
          id="session-glow"
          cx="0"
          cy="0"
          r="1"
          gradientUnits="userSpaceOnUse"
          gradientTransform="translate(1643 1019) rotate(-148) scale(560 390)"
        >
          <stop stopColor="#572014" stopOpacity="0.38" />
          <stop offset="0.7" stopColor="#241714" stopOpacity="0.12" />
          <stop offset="1" stopColor="#111212" stopOpacity="0" />
        </radialGradient>
      </defs>
    </svg>
  );
}

export default function IntroduceSession() {
  return (
    <section id="session" className="session-intro-bg relative w-full overflow-hidden">
      <div className="session-intro-canvas">
        <SessionBackground />

        <header className="session-intro-header">
          <div>
            <p className="landing-section-kicker session-intro-kicker">OUR TRACKS</p>
            <h2 className="landing-section-title session-intro-title">관심을 실력으로 바꾸는 네 개의 트랙</h2>
          </div>
          <p className="landing-section-copy session-intro-summary">
            <span>각자의 분야에서 기본기를 쌓고, 서로 다른 전문성을</span>
            <span>연결해 아이디어를 실제 서비스로 완성합니다.</span>
          </p>
        </header>

        <div aria-hidden className="session-grid-line session-grid-line--vertical" />
        <div aria-hidden className="session-grid-line session-grid-line--horizontal" />

        <div className="session-track-grid">
          {tracks.map((track) => (
            <article key={track.number} className="session-track-card">
              <TrackMotif number={track.number} />
              <p className="session-track-label">TRACK {track.number}</p>
              <h3 className="session-track-title">{track.title}</h3>
              <p className="session-track-headline">{track.headline}</p>
              <p className="session-track-description">
                {track.descriptionLines.map((line) => (
                  <span key={line}>{line}</span>
                ))}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
