'use client';

import { useState } from 'react';
import NotificationForm from '@/components/NotificationForm';

export default function Recruit() {
  const [open, setOpen] = useState(false);

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

      {/* 평소 모드: 알림 신청 pill → 클릭 시 이메일 폼 노출 */}
      {open ? (
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
