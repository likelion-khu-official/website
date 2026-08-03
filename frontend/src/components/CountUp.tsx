'use client';

import { useEffect, useRef, useState } from 'react';

// 섹션이 화면에 들어올 때마다 0부터 목표값까지 카운트업 (easeOutCubic).
// 뷰포트를 벗어나면 0으로 리셋해, 아래로→위로→아래로 오갈 때마다 다시 재생된다(페이딩과 동일 리듬).
export default function CountUp({
  end,
  duration = 1800,
}: {
  end: number;
  duration?: number;
}) {
  const [value, setValue] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let raf = 0;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry.isIntersecting) {
          if (reduce) {
            setValue(end);
            return;
          }
          cancelAnimationFrame(raf);
          const start = performance.now();
          const tick = (now: number) => {
            const p = Math.min((now - start) / duration, 1);
            const eased = 1 - Math.pow(1 - p, 3);
            setValue(Math.round(eased * end));
            if (p < 1) raf = requestAnimationFrame(tick);
          };
          raf = requestAnimationFrame(tick);
        } else if (!reduce) {
          // 화면을 벗어나면 리셋 — 재진입 때 다시 0부터 올라간다.
          cancelAnimationFrame(raf);
          setValue(0);
        }
      },
      { threshold: 0.4 }
    );

    observer.observe(el);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [end, duration]);

  return <span ref={ref}>{value.toLocaleString()}</span>;
}
