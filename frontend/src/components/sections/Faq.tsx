import Link from 'next/link';
import FaqItem from '@/components/FaqItem';
import { coreFaqs } from '@/lib/faq';

export default function Faq() {
  return (
    <section
      id="faq"
      className="faq-bg relative w-full overflow-x-clip px-5 py-24 sm:px-8 sm:py-28 lg:py-32"
    >
      <div className="mx-auto grid w-full max-w-6xl gap-12 lg:grid-cols-[minmax(240px,0.72fr)_minmax(0,1.28fr)] lg:gap-20">
        <header className="scroll-reveal lg:sticky lg:top-28 lg:self-start">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-accent">FAQ</p>
          <h2 className="break-keep text-[clamp(34px,4vw,54px)] font-semibold leading-[1.1] tracking-[-0.05em] text-white">
            궁금한 점부터
            <br />
            확인해보세요.
          </h2>
          <p className="mt-5 max-w-sm break-keep text-sm leading-6 text-white/48 sm:text-[15px]">
            지원과 활동에서 가장 많이 묻는 것들을 모았습니다.
          </p>
          {/* 데스크톱에선 사이드에, 모바일에선 목록 아래에 전체 보기 진입점을 둔다. */}
          <Link
            href="/faq"
            className="group mt-7 hidden items-center gap-2 text-sm font-medium text-white/70 transition-colors hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent lg:inline-flex"
          >
            전체 FAQ 보기
            <span aria-hidden className="transition-transform duration-200 group-hover:translate-x-1">
              →
            </span>
          </Link>
        </header>

        <div className="scroll-reveal w-full">
          <div className="border-b border-white/12">
            {coreFaqs.map((faq, index) => (
              <FaqItem key={faq.question} index={index} {...faq} />
            ))}
          </div>
          <Link
            href="/faq"
            className="group mt-6 inline-flex items-center gap-2 text-sm font-medium text-white/70 transition-colors hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent lg:hidden"
          >
            자주 묻는 질문 전체 보기
            <span aria-hidden className="transition-transform duration-200 group-hover:translate-x-1">
              →
            </span>
          </Link>
        </div>
      </div>
    </section>
  );
}
