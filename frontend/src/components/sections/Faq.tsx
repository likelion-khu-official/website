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
      className="faq-bg relative w-full overflow-hidden px-5 py-24 sm:px-8 sm:py-28 lg:py-32"
    >
      <div className="mx-auto grid w-full max-w-6xl gap-12 lg:grid-cols-[minmax(240px,0.72fr)_minmax(0,1.28fr)] lg:gap-20">
        <header className="scroll-reveal lg:sticky lg:top-28 lg:self-start">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-accent">
            FAQ
          </p>
          <h2 className="break-keep text-[clamp(34px,4vw,54px)] font-semibold leading-[1.1] tracking-[-0.05em] text-white">
            궁금한 점부터
            <br />
            확인해보세요.
          </h2>
          <p className="mt-5 max-w-sm break-keep text-sm leading-6 text-white/48 sm:text-[15px]">
            지원과 활동에 관해 자주 묻는 내용을 모았습니다.
          </p>
        </header>

        <div className="scroll-reveal w-full border-b border-white/12">
          {faqs.map((faq, index) => (
            <details key={faq.question} className="group border-t border-white/12">
              <summary className="grid min-h-[76px] cursor-pointer list-none grid-cols-[28px_minmax(0,1fr)_44px] items-center gap-3 py-3 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent sm:min-h-[88px] sm:grid-cols-[36px_minmax(0,1fr)_44px] sm:gap-4">
                <span className="text-xs tabular-nums text-white/30">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <span className="break-keep text-[15px] font-medium leading-6 text-white sm:text-lg">
                  {faq.question}
                </span>
                <span
                  aria-hidden
                  className="flex size-11 items-center justify-center rounded-full border border-white/12 text-white/60 transition-[border-color,color,transform] duration-200 group-open:rotate-45 group-open:border-accent/60 group-open:text-accent"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                    className="size-4"
                  >
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                </span>
              </summary>
              <div className="grid grid-cols-[28px_minmax(0,1fr)_44px] gap-3 pb-7 sm:grid-cols-[36px_minmax(0,1fr)_44px] sm:gap-4 sm:pb-8">
                <p className="col-start-2 break-keep text-sm leading-7 text-white/52 sm:text-[15px]">
                  {faq.answer}
                </p>
              </div>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
