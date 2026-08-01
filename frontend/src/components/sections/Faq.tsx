type QA = { question: string; answer: string };

const faqs: QA[] = [
  {
    question: '코딩을 전혀 몰라도 지원할 수 있나요?',
    answer:
      '네, 괜찮습니다. 멋사는 코딩이 처음인 사람도 개발부터 기획·디자인까지 함께 배우며 성장하는 걸 목표로 합니다.',
  },
  {
    question: '이미 코딩 경험이 있는데, 저한테도 맞는 곳일까요?',
    answer:
      '네. 자신의 수준과 관심 분야(프론트엔드·백엔드·PM·디자인 등)에 맞게 프로젝트에 기여하면서, 다른 트랙을 맡은 동료들과 함께 배우며 성장할 수 있습니다.',
  },
  {
    question: '활동은 구체적으로 어떻게 진행되나요?',
    answer:
      '한 학기 동안 세션 스터디, 아이디어톤, MT, 해커톤(멋쟁이사자처럼 중앙해커톤·권역별/기업별 연합 해커톤) 등이 이어집니다. 자세한 일정은 위의 "연간 활동 계획"에서 볼 수 있어요.',
  },
  {
    question: '활동하면서 실제로 서비스를 만드나요?',
    answer:
      '네. 아이디어를 실제로 작동하는 서비스로 만드는 걸 목표로 활동하고, 멋사 전체로는 그동안 완성된 서비스가 1,800개 이상 쌓였습니다.',
  },
  {
    question: '서울캠퍼스·국제캠퍼스 상관없이 지원할 수 있나요?',
    answer:
      '네, 지원은 캠퍼스와 상관없이 가능합니다. 다만 세션·활동은 국제캠퍼스(용인)에서 진행되니 이 점을 참고해주세요.',
  },
  {
    question: '지금 지원할 수 있나요?',
    answer:
      '모집 시기에는 이 사이트에서 바로 지원서를 낼 수 있고, 평소에는 "모집 시작 알림 받기"를 신청해두면 다음 모집이 열릴 때 안내를 받을 수 있습니다.',
  },
];

export default function Faq() {
  return (
    <section
      id="faq"
      className="faq-bg relative flex min-h-screen min-h-[100svh] w-full flex-col items-center justify-center gap-12 overflow-hidden px-5 py-20 sm:px-8 sm:py-24"
    >
      <div className="scroll-reveal relative flex flex-col items-center gap-3 text-center">
        <p className="landing-section-copy">
          궁금한 점이 있나요
        </p>
        <h2 className="landing-section-title text-balance break-keep">
          자주 묻는 질문
        </h2>
      </div>

      <div className="scroll-reveal relative flex w-full max-w-[860px] flex-col gap-3">
        {faqs.map((faq) => (
          <details
            key={faq.question}
            className="group rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-4 open:bg-white/[0.07] sm:px-7 sm:py-5"
          >
            <summary className="flex cursor-pointer list-none items-start gap-3 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-accent sm:gap-4">
              <span
                aria-hidden
                className="shrink-0 font-bold text-accent"
                style={{ fontSize: 'clamp(15px, 1.3vw, 20px)', letterSpacing: '-0.4px' }}
              >
                Q.
              </span>
              <span
                className="grow text-balance break-keep font-medium text-white"
                style={{ fontSize: 'clamp(15px, 1.3vw, 20px)', letterSpacing: '-0.4px' }}
              >
                {faq.question}
              </span>
              <span
                aria-hidden
                className="flex h-6 w-6 shrink-0 items-center justify-center text-accent transition-transform duration-200 group-open:rotate-45"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="h-4 w-4">
                  <path d="M12 5v14M5 12h14" />
                </svg>
              </span>
            </summary>
            <div className="mt-3 border-t border-accent/30 pt-3">
              <div className="flex items-start gap-3 sm:gap-4">
                <span
                  aria-hidden
                  className="shrink-0 font-bold text-accent"
                  style={{ fontSize: 'clamp(14px, 1.05vw, 18px)', letterSpacing: '-0.3px' }}
                >
                  A.
                </span>
                <p
                  className="grow text-balance break-keep text-[#c7c7c7]"
                  style={{ fontSize: 'clamp(14px, 1.05vw, 18px)', letterSpacing: '-0.3px', lineHeight: 1.6 }}
                >
                  {faq.answer}
                </p>
              </div>
            </div>
          </details>
        ))}
      </div>
    </section>
  );
}
