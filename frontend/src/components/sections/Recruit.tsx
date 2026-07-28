'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import NotificationForm from '@/components/NotificationForm';
import { getRecruitmentStatus } from '@/lib/applicationApi';

export default function Recruit() {
  const [open, setOpen] = useState(false);
  // 모집이 열려 있으면 이 자리는 알림 신청 대신 지원폼(/apply)으로 안내한다(#152 · 모집.md).
  const [recruiting, setRecruiting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getRecruitmentStatus()
      .then((s) => {
        if (!cancelled) setRecruiting(s.open);
      })
      .catch(() => {
        // 상태를 못 불러오면 평소(모집 알림) 모드로 둔다.
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

      {/* 모집 중이면 지원폼으로, 평소엔 알림 신청 pill → 클릭 시 이메일 폼 노출 */}
      {recruiting ? (
        <Link
          href="/apply"
          className="rounded-full border border-accent/40 bg-accent/15 text-white hover:bg-accent/25 transition-colors"
          style={{
            padding: 'clamp(14px, 1.4vw, 22px) clamp(32px, 3.2vw, 56px)',
            fontSize: 'clamp(16px, 1.35vw, 24px)',
            letterSpacing: '-0.8px',
          }}
        >
          지금 지원하기
        </Link>
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
