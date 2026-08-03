'use client';

import { useEffect } from 'react';
import { getAnonymousVisitId, trackSectionReach, type LandingSectionKey } from '@/lib/publicAnalytics';

const SECTIONS: Array<{ id: string; key: LandingSectionKey }> = [
  { id: 'project', key: 'PROJECT' },
  { id: 'members', key: 'STAFF' },
  { id: 'blog', key: 'BLOG' },
  { id: 'recruit', key: 'RECRUIT' },
];

export default function LandingSectionTracker() {
  useEffect(() => {
    const visitId = getAnonymousVisitId();
    if (!visitId || typeof IntersectionObserver === 'undefined') return;

    const elements = new Map<Element, LandingSectionKey>();
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const key = elements.get(entry.target);
        if (!key) return;
        const seenKey = `likelion-khu.analytics.section.${visitId}.${key}`;
        if (window.sessionStorage.getItem(seenKey) !== '1') {
          window.sessionStorage.setItem(seenKey, '1');
          trackSectionReach(key);
        }
        observer.unobserve(entry.target);
      });
    }, {
      // 섹션 시작점이 화면 하단 가장자리만 스친 경우는 제외하고 실제 콘텐츠 영역에 들어오면 기록한다.
      rootMargin: '0px 0px -20% 0px',
      threshold: 0,
    });

    SECTIONS.forEach(({ id, key }) => {
      const element = document.getElementById(id);
      if (!element) return;
      elements.set(element, key);
      const seenKey = `likelion-khu.analytics.section.${visitId}.${key}`;
      if (window.sessionStorage.getItem(seenKey) !== '1') observer.observe(element);
    });

    return () => observer.disconnect();
  }, []);

  return null;
}
