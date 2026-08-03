import type { Metadata } from 'next';
import SiteHeader from '@/components/SiteHeader';
import BackLink from '@/components/BackLink';
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
      <SiteHeader />

      <main className="mx-auto w-full max-w-3xl px-5 pb-28 pt-4 sm:px-8 sm:pt-6">
        <div className="mb-5 sm:mb-7">
          <BackLink href="/#faq" />
        </div>
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
