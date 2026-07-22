'use client';

import { useEffect, useState } from 'react';
import NotificationForm from '@/components/NotificationForm';
import type { PublicRecruitmentStatusResponse } from '@shared/types/recruitment';

export default function Recruit() {
  const [open, setOpen] = useState(false);
  // null = 아직 확인 전(평소 모드로 렌더 — 모집중 배너가 늦게 튀어나오는 것보단 안전한 기본값)
  const [recruiting, setRecruiting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/recruitment/status')
      .then((res) => (res.ok ? (res.json() as Promise<PublicRecruitmentStatusResponse>) : null))
      .then((data) => {
        if (!cancelled && data) setRecruiting(data.open);
      })
      .catch(() => {
        // 조회 실패 시 평소(모집 알림) 모드로 안전하게 유지
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section
      id="recruit"
      className="recruit-bg relative min-h-screen w-full flex flex-col items-center justify-center gap-14 px-6 py-24 overflow-hidden"
    >
      {/* 문구 */}
      <div className="relative flex flex-col items-center gap-2 text-center">
        <p
          className="text-accent font-bold"
          style={{ fontSize: 'clamp(24px, 3vw, 52px)', letterSpacing: '-2px', lineHeight: 1.35 }}
        >
          아이디어를 현실로 만드는 여정,
        </p>
        <p
          className="text-white font-bold"
          style={{ fontSize: 'clamp(24px, 3vw, 52px)', letterSpacing: '-2px', lineHeight: 1.35 }}
        >
          경희대학교 멋쟁이사자처럼과 함께할 아기사자를 기다립니다.
        </p>
      </div>

      {/* 모집중: 지원 안내(임시 안내 — 지원폼 #152 완성 전까지) / 평소: 알림 신청 pill → 클릭 시 이메일 폼 노출 */}
      {recruiting ? (
        <a
          href="/recruit"
          className="rounded-full border border-white/10 bg-white/[0.07] text-white hover:bg-white/[0.12] transition-colors"
          style={{
            padding: 'clamp(14px, 1.4vw, 22px) clamp(32px, 3.2vw, 56px)',
            fontSize: 'clamp(16px, 1.35vw, 24px)',
            letterSpacing: '-0.8px',
          }}
        >
          지금 모집 중 — 지원 안내 보기
        </a>
      ) : open ? (
        <NotificationForm />
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="rounded-full border border-white/10 bg-white/[0.07] text-muted hover:text-white hover:bg-white/[0.12] transition-colors"
          style={{
            padding: 'clamp(14px, 1.4vw, 22px) clamp(32px, 3.2vw, 56px)',
            fontSize: 'clamp(16px, 1.35vw, 24px)',
            letterSpacing: '-0.8px',
          }}
        >
          지원기간 신청 알림 받기
        </button>
      )}
    </section>
  );
}
