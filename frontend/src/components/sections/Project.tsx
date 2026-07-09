// Figma 캔버스 폭 1728 기준. 카드 오프셋/폭을 %로 환산해 반응형 유지.
const REF = 1728;
const pct = (px: number) => `${(px / REF) * 100}%`;

// 상단 warm 글로우 — Figma 107:609 그대로. 787×1457 gradient를 90° 회전해 1457×787 박스에 채움.
// (세션 섹션 session-glow-* 와 동일한 재현 방식. SVG는 Figma 원본이라 색·스톱 100% 일치.)
const GLOW_SVG =
  "url(\"data:image/svg+xml;utf8,<svg viewBox='0 0 787 1457' xmlns='http://www.w3.org/2000/svg' preserveAspectRatio='none'><rect x='0' y='0' height='100%' width='100%' fill='url(%23grad)' opacity='0.33000001311302185'/><defs><radialGradient id='grad' gradientUnits='userSpaceOnUse' cx='0' cy='0' r='10' gradientTransform='matrix(141.53 -248.28 36.425 512.97 -313.12 2392.3)'><stop stop-color='rgba(255,246,232,1)' offset='0.23771'/><stop stop-color='rgba(235,193,177,1)' offset='0.25641'/><stop stop-color='rgba(216,140,122,1)' offset='0.2751'/><stop stop-color='rgba(206,114,95,1)' offset='0.28445'/><stop stop-color='rgba(196,87,67,1)' offset='0.2938'/><stop stop-color='rgba(186,61,40,1)' offset='0.30315'/><stop stop-color='rgba(181,47,26,1)' offset='0.30782'/><stop stop-color='rgba(176,34,12,1)' offset='0.3125'/><stop stop-color='rgba(132,26,9,0.75)' offset='0.36846'/><stop stop-color='rgba(88,17,6,0.5)' offset='0.42443'/><stop stop-color='rgba(44,9,3,0.25)' offset='0.48039'/><stop stop-color='rgba(0,0,0,0)' offset='0.53636'/><stop stop-color='rgba(0,0,0,0)' offset='1'/></radialGradient></defs></svg>\")";

// DOM/페인트 순서 = Figma 그대로 (바깥 카드 먼저, 안쪽 카드 나중 → 안쪽이 위).
// right: rect5826, left: rect5830(수평 flip). offset = 카드 중심의 좌우 거리(px).
const sideCards: { offset: number; side: 'left' | 'right' }[] = [
  { offset: 659, side: 'right' },
  { offset: 659, side: 'left' },
  { offset: 559, side: 'right' },
  { offset: 559, side: 'left' },
  { offset: 459, side: 'right' },
  { offset: 459, side: 'left' },
];

export default function Project() {
  return (
    <section
      id="project"
      className="project-bg relative min-h-screen w-full flex flex-col items-center justify-center gap-16 px-6 py-24 overflow-hidden"
    >
      {/* 상단 warm 글로우 (Figma 107:609) — 박스 중심이 캔버스 중심보다 +232px 우측 편향 */}
      <div
        aria-hidden
        className="pointer-events-none absolute z-0 flex items-center justify-center"
        style={{
          top: -58,
          left: '50%',
          width: 1457,
          height: 787,
          marginLeft: -1457 / 2 + 232,
        }}
      >
        <div className="flex-none" style={{ transform: 'rotate(90deg) scaleY(-1)' }}>
          <div style={{ width: 787, height: 1457, backgroundImage: GLOW_SVG, backgroundSize: '100% 100%' }} />
        </div>
      </div>

      <div className="relative z-[1] flex flex-col items-center gap-4 text-center">
        <p
          className="text-white"
          style={{ fontSize: 'clamp(22px, 2.3vw, 40px)', letterSpacing: '-1.6px' }}
        >
          아이디어가 경험이 되는 순간
        </p>
        <p
          className="text-accent font-semibold"
          style={{ fontSize: 'clamp(22px, 2.8vw, 48px)', letterSpacing: '-1.92px' }}
        >
          직접 기획하고 개발한 프로젝트들을 만나보세요.
        </p>
      </div>

      {/* 카드 스테이지 — 1728 x 578 비율 고정, 폭에 맞춰 전체 스케일 */}
      <div className="relative w-full max-w-[1728px]" style={{ aspectRatio: `${REF} / 578` }}>
        {/* 가운데 큰 카드 */}
        <div
          className="absolute top-1/2 left-1/2 rounded-[20px] bg-[#d9d9d9]"
          style={{
            width: pct(1129),
            height: '100%',
            transform: 'translate(-50%, -50%)',
            zIndex: 1,
          }}
        />

        {/* 양옆 사다리꼴 카드들 */}
        {sideCards.map((c, i) => {
          const signed = c.side === 'right' ? c.offset : -c.offset;
          const src = c.side === 'right' ? '/project/rect5826.svg' : '/project/rect5830.svg';
          return (
            <div
              key={i}
              className="absolute top-1/2"
              style={{
                left: `calc(50% + ${pct(signed)})`,
                width: pct(409),
                height: '100%',
                transform: 'translate(-50%, -50%)',
                zIndex: 2 + i,
              }}
            >
              <div
                className="relative w-full h-full"
                style={c.side === 'left' ? { transform: 'scaleX(-1)' } : undefined}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={src}
                  alt=""
                  className="absolute left-0 right-0 block w-full"
                  style={{ top: '1.09%', bottom: '1.22%', height: '97.69%' }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
