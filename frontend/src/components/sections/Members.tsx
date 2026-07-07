type Lead = {
  role: string;
  name: string;
  dept: string;
  desc: string;
  photo?: string;
};

type Session = {
  role: string;
  name: string;
  dept: string;
  photo?: string;
};

type Promo = {
  role: string;
  name: string;
  dept: string;
};

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

const sessions: Session[] = [
  { role: '프론트 세션장', name: '이름', dept: '학과 / 학번' },
  { role: '기획/디자인 세션장', name: '이름', dept: '학과 / 학번' },
  { role: '백엔드 세션장', name: '이름', dept: '학과 / 학번' },
  { role: 'AI 세션장', name: '이름', dept: '학과 / 학번' },
];

const promos: Promo[] = Array.from({ length: 7 }, () => ({
  role: '홍보부장',
  name: '이름',
  dept: '학과 / 학번',
}));

const CARD =
  'rounded-[20px] border border-[rgba(255,80,0,0.22)] bg-[rgba(18,18,18,0.72)] backdrop-blur-[6px]';

const PHOTO = 'rounded-[14px] bg-gradient-to-br from-[#4a4a4a] to-[#2c2c2c] shrink-0';

function Photo({ className = '' }: { className?: string }) {
  return <div className={`${PHOTO} ${className}`} aria-hidden />;
}

function Role({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="text-accent font-medium"
      style={{ fontSize: 'clamp(12px, 0.85vw, 16px)', letterSpacing: '-0.4px' }}
    >
      {children}
    </p>
  );
}

function Name({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="text-white font-bold leading-none"
      style={{ fontSize: 'clamp(18px, 1.5vw, 28px)', letterSpacing: '-0.8px' }}
    >
      {children}
    </p>
  );
}

function Dept({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="text-[#8b8b8b]"
      style={{ fontSize: 'clamp(12px, 0.85vw, 16px)', letterSpacing: '-0.4px' }}
    >
      {children}
    </p>
  );
}

export default function Members() {
  return (
    <section
      id="members"
      className="members-bg relative min-h-screen w-full flex flex-col items-center justify-center gap-14 px-6 py-24 overflow-hidden"
    >
      {/* 헤더 */}
      <div className="relative flex flex-col items-center gap-4 text-center">
        <p
          className="text-white"
          style={{ fontSize: 'clamp(22px, 2.3vw, 40px)', letterSpacing: '-1.6px' }}
        >
          운영진 소개
        </p>
        <p
          className="text-accent font-semibold max-w-[1000px]"
          style={{ fontSize: 'clamp(22px, 2.8vw, 48px)', letterSpacing: '-1.92px' }}
        >
          경희대학교 멋쟁이 사자처럼 14기 운영진을 소개합니다.
        </p>
      </div>

      <div className="relative w-[82%] max-w-[1417px] flex flex-col gap-5">
        {/* 상단: 회장/부회장(넓은 카드) + 세션장 4카드 */}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.35fr_1fr_1fr]">
          {/* 회장 · 부회장 */}
          <div className="flex flex-col gap-5">
            {leads.map((m) => (
              <div key={m.role} className={`${CARD} flex gap-5 p-5`}>
                <Photo className="w-[42%] aspect-[4/3] self-start" />
                <div className="flex flex-col gap-3 py-1">
                  <Role>{m.role}</Role>
                  <Name>{m.name}</Name>
                  <Dept>{m.dept}</Dept>
                  <p
                    className="text-[#5c5c5c] leading-relaxed"
                    style={{ fontSize: 'clamp(12px, 0.85vw, 16px)', letterSpacing: '-0.4px' }}
                  >
                    {m.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* 세션장 4카드 — 2열 x 2행 (좌: 프론트/기획, 우: 백엔드/AI) */}
          {[0, 2].map((colStart) => (
            <div key={colStart} className="flex flex-col gap-5">
              {[sessions[colStart], sessions[colStart + 1]].map((m) => (
                <div key={m.role} className={`${CARD} flex gap-4 p-5`}>
                  <Photo className="w-[45%] aspect-square self-start" />
                  <div className="flex flex-col gap-2.5 py-1">
                    <Role>{m.role}</Role>
                    <Name>{m.name}</Name>
                    <Dept>{m.dept}</Dept>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* 하단: 홍보부장 7카드 */}
        <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-7">
          {promos.map((m, i) => (
            <div key={i} className={`${CARD} flex flex-col gap-2.5 p-5`}>
              <Role>{m.role}</Role>
              <Name>{m.name}</Name>
              <Dept>{m.dept}</Dept>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
