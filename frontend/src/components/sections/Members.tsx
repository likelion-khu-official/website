// Figma 115:60 규격 그대로. 상단 그리드 1390 기준 컬럼 580:380:390, gap 20.
// 카드 높이 221 고정, 리드 사진 240×188(가로), 세션 사진 174×188(세로), 홍보 180×128.

type Lead = { role: string; name: string; dept: string; desc: string };
type Session = { role: string; name: string; dept: string };

const leads: Lead[] = [
  {
    role: '회장 / 분야',
    name: '이름',
    dept: '학과 / 학번',
    desc: 'Text Text Text Text Text Text Text Text Text Text Text Text Text Text Text Text Text Text Text Text Text',
  },
  {
    role: '부회장 / 분야',
    name: '이름',
    dept: '학과 / 학번',
    desc: 'Text Text Text Text Text Text Text Text Text Text Text Text Text Text Text Text Text Text Text Text Text',
  },
];

// 그리드 배치 순서(행 우선): [회장, 프론트, 백엔드] / [부회장, 기획, AI]
const sessionsRow1: Session[] = [
  { role: '프론트 세션장', name: '이름', dept: '학과 / 학번' },
  { role: '백엔드 세션장', name: '이름', dept: '학과 / 학번' },
];
const sessionsRow2: Session[] = [
  { role: '기획/디자인 세션장', name: '이름', dept: '학과 / 학번' },
  { role: 'AI 세션장', name: '이름', dept: '학과 / 학번' },
];

const promoCount = 7;

const CARD =
  'relative rounded-[20px] border border-[rgba(255,80,0,0.22)] bg-[rgba(18,18,18,0.55)] backdrop-blur-[6px]';
const PHOTO = 'absolute rounded-[12px] bg-gradient-to-br from-[#4a4a4a] to-[#2c2c2c]';

function LeadCard({ role, name, dept, desc }: Lead) {
  return (
    <div className={CARD}>
      {/* 사진 240×188, inset 18 (of 580×221) */}
      <div className={PHOTO} style={{ left: '3.103%', top: '8.14%', width: '41.379%', height: '85.068%' }} />
      <p
        className="absolute text-accent font-medium"
        style={{ left: '50.69%', top: '12.22%', fontSize: 'clamp(11px, 0.95vw, 16px)', letterSpacing: '-0.4px' }}
      >
        {role}
      </p>
      <p
        className="absolute text-white font-bold leading-none"
        style={{ left: '50.69%', top: '26.24%', fontSize: 'clamp(18px, 1.55vw, 26px)', letterSpacing: '-0.8px' }}
      >
        {name}
      </p>
      <p
        className="absolute text-[#8b8b8b]"
        style={{ left: '50.69%', top: '47.06%', fontSize: 'clamp(10px, 0.8vw, 12px)', letterSpacing: '-0.4px' }}
      >
        {dept}
      </p>
      <p
        className="absolute text-[#5c5c5c] leading-relaxed"
        style={{ left: '50.69%', top: '64.71%', width: '39.828%', fontSize: 'clamp(11px, 0.85vw, 14px)', letterSpacing: '-0.3px' }}
      >
        {desc}
      </p>
    </div>
  );
}

function SessionCard({ role, name, dept }: Session) {
  return (
    <div className={CARD}>
      {/* 사진 174×188 (of ~380×221) */}
      <div className={PHOTO} style={{ left: '4.9%', top: '8.14%', width: '45%', height: '85.068%' }} />
      <p
        className="absolute text-accent font-medium"
        style={{ left: '56.5%', top: '13.1%', fontSize: 'clamp(10px, 0.85vw, 15px)', letterSpacing: '-0.4px' }}
      >
        {role}
      </p>
      <p
        className="absolute text-white font-bold leading-none"
        style={{ left: '56.5%', top: '23.9%', fontSize: 'clamp(15px, 1.2vw, 20px)', letterSpacing: '-0.6px' }}
      >
        {name}
      </p>
      <p
        className="absolute text-[#8b8b8b]"
        style={{ left: '56.5%', top: '38.9%', fontSize: 'clamp(10px, 0.8vw, 12px)', letterSpacing: '-0.4px' }}
      >
        {dept}
      </p>
    </div>
  );
}

function PromoCard() {
  return (
    <div className={CARD} style={{ aspectRatio: '180 / 128' }}>
      <p
        className="absolute text-accent font-medium"
        style={{ left: '9.83%', top: '16.4%', fontSize: 'clamp(10px, 0.8vw, 13px)', letterSpacing: '-0.3px' }}
      >
        홍보부장
      </p>
      <p
        className="absolute text-white font-bold leading-none"
        style={{ left: '9.83%', top: '37.5%', fontSize: 'clamp(14px, 1.15vw, 20px)', letterSpacing: '-0.6px' }}
      >
        이름
      </p>
      <p
        className="absolute text-[#8b8b8b]"
        style={{ left: '9.83%', top: '63.3%', fontSize: 'clamp(9px, 0.72vw, 11px)', letterSpacing: '-0.3px' }}
      >
        학과 / 학번
      </p>
    </div>
  );
}

export default function Members() {
  return (
    <section
      id="members"
      className="members-bg relative min-h-screen w-full flex flex-col items-center justify-center gap-16 px-6 py-24 overflow-hidden"
    >
      {/* Figma 글로우 2겹 */}
      <div className="members-glow-base" />
      <div className="members-glow-accent" />

      {/* 헤더 */}
      <div className="relative z-[1] flex flex-col items-center gap-4 text-center">
        <p className="text-white" style={{ fontSize: 'clamp(22px, 2.3vw, 40px)', letterSpacing: '-1.6px' }}>
          운영진 소개
        </p>
        <p
          className="text-accent font-semibold max-w-[1000px]"
          style={{ fontSize: 'clamp(22px, 2.8vw, 48px)', letterSpacing: '-1.92px' }}
        >
          경희대학교 멋쟁이 사자처럼 14기 운영진을 소개합니다.
        </p>
      </div>

      <div className="relative z-[1] w-[82%] max-w-[1390px]">
        {/* 상단: 회장/부회장(580) · 세션장(380·390), 2행. gap 20(=1.4388% of 1390) */}
        <div
          className="grid"
          style={{
            gridTemplateColumns: '41.727% 27.338% 28.058%',
            gridTemplateRows: '1fr 1fr',
            columnGap: '1.4388%',
            rowGap: '4.329%',
            aspectRatio: '1390 / 462',
          }}
        >
          <LeadCard {...leads[0]} />
          <SessionCard {...sessionsRow1[0]} />
          <SessionCard {...sessionsRow1[1]} />
          <LeadCard {...leads[1]} />
          <SessionCard {...sessionsRow2[0]} />
          <SessionCard {...sessionsRow2[1]} />
        </div>

        {/* 하단: 홍보부장 180×128 ×7, gap 20 */}
        <div className="grid grid-cols-7" style={{ columnGap: '1.4388%', marginTop: '1.4388%' }}>
          {Array.from({ length: promoCount }).map((_, i) => (
            <PromoCard key={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
