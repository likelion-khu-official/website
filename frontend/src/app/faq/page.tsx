import type { Metadata } from 'next';
import Link from 'next/link';
import FaqItem from '@/components/FaqItem';
import { faqGroups } from '@/lib/faq';

export const metadata: Metadata = {
  title: '자주 묻는 질문 (FAQ) | LIKELION KHU',
  description:
    '멋쟁이사자처럼 경희대 지원 자격, 모집·선발, 활동 방식, 프로젝트까지 자주 묻는 질문을 주제별로 모았습니다.',
  alternates: { canonical: '/faq' },
  openGraph: {
    title: '자주 묻는 질문 (FAQ) | LIKELION KHU',
    description:
      '멋쟁이사자처럼 경희대 지원 자격, 모집·선발, 활동 방식, 프로젝트까지 자주 묻는 질문을 주제별로 모았습니다.',
    url: '/faq',
  },
};

// 검색엔진용 FAQ 구조화 데이터 — 전체 문항을 그대로 노출한다.
const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: faqGroups.flatMap((group) =>
    group.items.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: { '@type': 'Answer', text: item.answer },
    })),
  ),
};

export default function FaqPage() {
  return (
    <div className="min-h-screen min-h-[100svh] w-full overflow-x-hidden bg-background text-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <header className="relative z-10 mx-auto flex max-w-[1440px] items-center justify-between px-5 py-5 sm:px-10 sm:py-6 lg:px-16">
        <Link
          href="/"
          aria-label="멋쟁이사자처럼 경희대 홈"
          className="flex min-h-11 items-center gap-3 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="" className="h-9 w-auto object-contain" />
          <span className="hidden text-sm font-semibold tracking-[-0.02em] text-white/75 sm:block">
            멋쟁이사자처럼 경희대
          </span>
        </Link>
        <Link
          href="/#faq"
          className="inline-flex min-h-11 shrink-0 items-center rounded-full border border-white/15 px-4 py-2 text-sm text-white/65 transition hover:border-white/30 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          홈으로
        </Link>
      </header>

      <main className="mx-auto w-full max-w-3xl px-5 pb-28 pt-8 sm:px-8 sm:pt-12 lg:pt-16">
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-accent">FAQ</p>
        <h1 className="break-keep text-[clamp(30px,5vw,46px)] font-semibold leading-[1.12] tracking-[-0.04em] text-white">
          자주 묻는 질문
        </h1>
        <p className="mt-4 max-w-xl break-keep text-sm leading-7 text-white/50 sm:text-[15px]">
          지원 자격부터 활동 방식, 프로젝트까지 — 궁금한 점을 주제별로 정리했습니다.
        </p>

        <div className="mt-12 sm:mt-14">
          {faqGroups.map((group) => (
            <section key={group.category} className="mb-11 last:mb-0 sm:mb-14">
              <h2 className="mb-1 flex items-center gap-2.5 text-sm font-semibold uppercase tracking-[0.14em] text-white/45">
                <span aria-hidden className="h-px w-5 bg-accent/70" />
                {group.category}
              </h2>
              <div className="border-b border-white/12">
                {group.items.map((item) => (
                  <FaqItem key={item.question} {...item} />
                ))}
              </div>
            </section>
          ))}
        </div>
      </main>
    </div>
  );
}
