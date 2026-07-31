type Track = {
  number: string;
  title: string;
  headline: string;
  description: string;
  motifs: { src: string; left: number; width: number }[];
};

const MOTIF_FRAME_WIDTH = 337.037;

const tracks: Track[] = [
  {
    number: '01',
    title: 'Front-end',
    headline: '빠르게 만들고, 섬세하게 다듬습니다.',
    description:
      '아이디어를 인터랙티브한 화면으로 가장 먼저 구현합니다. 컴포넌트 설계, 반응형 UI, 접근성, API 연동을 익히고 새로운 도구를 능동적으로 활용해 완성도 높은 사용자 경험을 만듭니다.',
    motifs: [
      { src: '/session/ellipse21.svg', left: 30.33, width: 54.768 },
      { src: '/session/ellipse17.svg', left: 74.15, width: 54.768 },
      { src: '/session/group12.svg', left: 204.75, width: 33.704 },
      { src: '/session/ellipse17.svg', left: 251.09, width: 54.768 },
    ],
  },
  {
    number: '02',
    title: 'Back-end',
    headline: '보이지 않는 곳에서 서비스를 단단하게 만듭니다.',
    description:
      '데이터 모델과 API, 인증, 비즈니스 로직을 설계합니다. 기능 구현을 넘어 성능과 안정성, 운영까지 고민하며 오래 살아남는 서비스의 기반을 만듭니다.',
    motifs: [
      { src: '/session/ellipse17.svg', left: 33.293, width: 54.768 },
      { src: '/session/ellipse17.svg', left: 77.113, width: 54.768 },
      { src: '/session/group13.svg', left: 207.713, width: 33.704 },
      { src: '/session/ellipse21.svg', left: 254.053, width: 54.768 },
    ],
  },
  {
    number: '03',
    title: 'PM · Design',
    headline: '좋은 아이디어보다, 풀어야 할 문제를 먼저 찾습니다.',
    description:
      '사용자를 관찰하고 가설을 빠르게 검증해 제품의 방향을 정합니다. 기획과 UX/UI를 유연하게 오가며 팀의 생각을 누구나 이해하고 사용할 수 있는 경험으로 구체화합니다.',
    motifs: [
      { src: '/session/ellipse33.svg', left: 38.749, width: 54.768 },
      { src: '/session/ellipse17.svg', left: 82.569, width: 54.768 },
      { src: '/session/group16.svg', left: 128.909, width: 133.13 },
      { src: '/session/ellipse21.svg', left: 264, width: 54.768 },
    ],
  },
  {
    number: '04',
    title: 'AI',
    headline: '기술 시연을 넘어, 쓸 이유가 있는 AI를 만듭니다.',
    description:
      '데이터와 모델의 원리를 익히고 문제에 맞는 접근법을 실험합니다. 정확도만 보는 데서 멈추지 않고 실제 사용자와 서비스 맥락 속에서 유용한 AI 기능을 구현합니다.',
    motifs: [
      { src: '/session/ellipse17.svg', left: 39.152, width: 54.768 },
      { src: '/session/ellipse17.svg', left: 82.962, width: 54.768 },
      { src: '/session/group18.svg', left: 189.132, width: 32.861 },
      { src: '/session/group17.svg', left: 213.562, width: 32.862 },
      { src: '/session/ellipse17.svg', left: 259.912, width: 54.768 },
    ],
  },
];

export default function IntroduceSession() {
  return (
    <section
      id="session"
      className="session-intro-bg relative flex min-h-screen min-h-[100svh] w-full items-center overflow-hidden px-5 py-24 sm:px-10 sm:py-28 lg:px-16 lg:py-32"
    >
      <div className="relative mx-auto w-full max-w-[1320px]">
        <header className="scroll-reveal grid gap-6 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-end lg:gap-16">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
              Our tracks
            </p>
            <h2 className="mt-3 max-w-4xl text-balance break-keep text-[clamp(34px,4.4vw,60px)] font-semibold leading-[1.12] tracking-[-0.055em] text-white">
              관심을 실력으로 바꾸는 네 개의 트랙
            </h2>
          </div>
          <p className="max-w-[420px] text-balance break-keep text-sm leading-6 text-white/50 sm:text-base lg:pb-1">
            각자의 분야에서 기본기를 쌓고, 서로 다른 전문성을 연결해 아이디어를
            실제 서비스로 완성합니다.
          </p>
        </header>

        <div className="mt-12 grid grid-cols-1 gap-4 sm:mt-14 lg:grid-cols-2 lg:gap-5">
          {tracks.map((track, index) => (
            <div
              key={track.title}
              className="scroll-reveal session-card-reveal min-w-0"
              style={{ '--reveal-y': `${30 + index * 8}px` } as React.CSSProperties}
            >
              <article className="group relative flex h-full min-h-[310px] overflow-hidden rounded-[28px] border border-white/[0.09] bg-white/[0.035] p-6 transition-[transform,border-color,background-color,box-shadow] duration-300 ease-out hover:-translate-y-1 hover:border-accent/35 hover:bg-white/[0.05] hover:shadow-[0_26px_80px_rgba(0,0,0,0.32)] sm:p-8">
                <div
                  aria-hidden
                  className="absolute inset-0 bg-[radial-gradient(circle_at_0%_0%,rgba(255,80,0,0.2),transparent_48%)] opacity-25 transition-opacity duration-300 group-hover:opacity-60"
                />
                <div aria-hidden className="absolute left-0 top-9 h-16 w-px bg-accent/80" />
                <div className="relative flex min-w-0 flex-1 flex-col">
                  <div className="flex items-center justify-between gap-6">
                    <span className="text-xs font-semibold tracking-[0.18em] text-accent">
                      TRACK {track.number}
                    </span>
                    <div
                      aria-hidden
                      className="relative h-12 w-[46%] max-w-[240px] shrink-0 after:absolute after:inset-x-0 after:bottom-0 after:h-10 after:bg-[radial-gradient(ellipse_at_50%_100%,rgba(255,80,0,0.16),transparent_65%)] after:opacity-0 after:transition-opacity after:duration-300 after:content-[''] group-hover:after:opacity-100"
                    >
                      {track.motifs.map((motif, motifIndex) => (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          key={`${motif.src}-${motifIndex}`}
                          src={motif.src}
                          alt=""
                          className="absolute bottom-0 z-[1] h-11 opacity-55 transition-[opacity,filter,transform] duration-300 group-hover:-translate-y-0.5 group-hover:opacity-100 group-hover:[filter:brightness(1.35)_drop-shadow(0_0_12px_rgba(255,80,0,0.2))]"
                          style={{
                            left: `${(motif.left / MOTIF_FRAME_WIDTH) * 100}%`,
                            width: `${(motif.width / MOTIF_FRAME_WIDTH) * 100}%`,
                          }}
                        />
                      ))}
                    </div>
                  </div>

                  <h3 className="mt-7 text-[clamp(28px,2.4vw,38px)] font-semibold tracking-[-0.045em] text-white">
                    {track.title}
                  </h3>
                  <p className="mt-4 max-w-[520px] break-keep text-[18px] font-semibold leading-[1.5] tracking-[-0.025em] text-white/90 sm:text-xl">
                    {track.headline}
                  </p>
                  <p className="mt-3 max-w-[540px] break-keep text-sm leading-6 text-white/48 sm:text-[15px] sm:leading-7">
                    {track.description}
                  </p>
                </div>
              </article>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
