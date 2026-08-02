import type { QA } from '@/lib/faq';

type Props = QA & {
  /** 있으면 번호(01, 02…)를 앞에 붙인다. 그룹 목록에선 생략(주제 라벨이 구조를 대신). */
  index?: number;
};

// 랜딩(번호형)과 /faq(그룹형)가 공유하는 아코디언 한 행.
export default function FaqItem({ question, answer, index }: Props) {
  const numbered = index !== undefined;
  const cols = numbered
    ? 'grid-cols-[28px_minmax(0,1fr)_40px] sm:grid-cols-[36px_minmax(0,1fr)_40px]'
    : 'grid-cols-[minmax(0,1fr)_40px]';

  return (
    <details className="group border-t border-white/12">
      <summary
        className={`grid min-h-[64px] cursor-pointer list-none items-center gap-3 py-3.5 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent sm:min-h-[76px] sm:gap-4 ${cols}`}
      >
        {numbered && (
          <span className="text-xs tabular-nums text-white/30">
            {String(index + 1).padStart(2, '0')}
          </span>
        )}
        <span className="break-keep text-[15px] font-medium leading-6 text-white sm:text-lg">
          {question}
        </span>
        <span
          aria-hidden
          className="flex size-10 items-center justify-center rounded-full border border-white/12 text-white/60 transition-[border-color,color,transform] duration-200 group-open:rotate-45 group-open:border-accent/60 group-open:text-accent"
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
      <div className={`pb-6 pr-12 sm:pb-7 ${numbered ? 'sm:pl-9' : ''}`}>
        <p className="break-keep text-sm leading-7 text-white/52 sm:text-[15px]">{answer}</p>
      </div>
    </details>
  );
}
