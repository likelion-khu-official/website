const CARD_W = 337.037;
const CARD_H = 382.537;
const ICON_TOP_PCT = (294.06 / CARD_H) * 100;
const ICON_H_PCT = (54.768 / CARD_H) * 100;

type Icon = { src: string; left: number; width: number };

type Card = {
  title: string;
  desc: string[];
  icons: Icon[];
};

const cards: Card[] = [
  {
    title: 'Front-end',
    desc: ['UI 구현 ･ 사용자 화면 개발'],
    icons: [
      { src: '/session/ellipse21.svg', left: 30.33, width: 54.768 },
      { src: '/session/ellipse17.svg', left: 74.15, width: 54.768 },
      { src: '/session/group12.svg', left: 204.75, width: 33.704 },
      { src: '/session/ellipse17.svg', left: 251.09, width: 54.768 },
    ],
  },
  {
    title: 'Back-end',
    desc: ['서버 ･ DB ･ API 구축'],
    icons: [
      { src: '/session/ellipse17.svg', left: 33.293, width: 54.768 },
      { src: '/session/ellipse17.svg', left: 77.113, width: 54.768 },
      { src: '/session/group13.svg', left: 207.713, width: 33.704 },
      { src: '/session/ellipse21.svg', left: 254.053, width: 54.768 },
    ],
  },
  {
    title: 'PM ･Design',
    desc: ['문제 정의 ･  기능 설계', 'UX/UI 설계 ･  시각 디자인'],
    icons: [
      { src: '/session/ellipse33.svg', left: 38.749, width: 54.768 },
      { src: '/session/ellipse17.svg', left: 82.569, width: 54.768 },
      { src: '/session/group16.svg', left: 128.909, width: 133.13 },
      { src: '/session/ellipse21.svg', left: 264, width: 54.768 },
    ],
  },
  {
    title: 'AI',
    desc: ['모델 학습 ･ 인식/분석 기능 구현'],
    icons: [
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
      className="session-intro-bg relative min-h-screen w-full flex flex-col items-center justify-center gap-16 px-6 py-24 overflow-hidden"
    >
      <div className="session-glow-top-wrap">
        <div className="session-glow-top" />
      </div>
      <div className="session-glow-bottom-wrap">
        <div className="session-glow-bottom" />
      </div>

      <div className="relative flex flex-col items-center gap-4 text-center">
        <p
          className="text-white"
          style={{ fontSize: 'clamp(22px, 2.3vw, 40px)', letterSpacing: '-1.6px' }}
        >
          멋쟁이 사자처럼 세션
        </p>
        <p
          className="text-accent font-semibold max-w-[941px]"
          style={{ fontSize: 'clamp(22px, 2.8vw, 48px)', letterSpacing: '-1.92px' }}
        >
          트랙별 맞춤 스터디로 탄탄한 개발 역량을 쌓아갑니다.
        </p>
      </div>

      <div
        className="relative w-[82%] max-w-[1417px] grid grid-cols-2 md:grid-cols-4 gap-[34px]"
      >
        {cards.map((card) => (
          <div
            key={card.title}
            className="group relative rounded-[16.85px] bg-[rgba(27,29,31,0.71)] hover:bg-[#fdf1e6] transition-colors duration-300 ease-out hover:scale-[1.04] hover:-translate-y-1"
            style={{
              aspectRatio: `${CARD_W} / ${CARD_H}`,
              transitionProperty: 'background-color, transform',
            }}
          >
            <div
              className="absolute flex flex-col gap-4 text-[#9ba5b0] group-hover:text-accent transition-colors duration-300 ease-out"
              style={{ left: '11.9%', top: '10.5%', width: '80%' }}
            >
              <p style={{ fontSize: 'clamp(18px, 1.7vw, 32px)', letterSpacing: '-0.8px' }}>
                {card.title}
              </p>
              <div style={{ fontSize: 'clamp(13px, 1.05vw, 20px)', letterSpacing: '-0.5px', lineHeight: 1.3 }}>
                {card.desc.map((line) => (
                  <p key={line}>{line}</p>
                ))}
              </div>
            </div>

            {card.icons.map((icon, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={i}
                src={icon.src}
                alt=""
                className="absolute pointer-events-none transition-[filter] duration-300 ease-out group-hover:[filter:sepia(1)_saturate(6)_hue-rotate(-15deg)_brightness(1.05)]"
                style={{
                  left: `${(icon.left / CARD_W) * 100}%`,
                  top: `${ICON_TOP_PCT}%`,
                  width: `${(icon.width / CARD_W) * 100}%`,
                  height: `${ICON_H_PCT}%`,
                }}
              />
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}
