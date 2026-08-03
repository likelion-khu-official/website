'use client';

import { useState } from 'react';
import Link from 'next/link';
import NotificationForm from '@/components/NotificationForm';
import { useRecruitmentStatus } from '@/lib/useRecruitmentStatus';

export default function Recruit() {
  const [open, setOpen] = useState(false);
  // 모집이 열려 있으면 이 자리는 알림 신청 대신 지원폼(/apply)으로 안내한다(#152 · 모집.md).
  const { recruiting } = useRecruitmentStatus();

  return (
    <section
      id="recruit"
      aria-labelledby="recruit-title"
      className="recruit-bg relative flex min-h-[88svh] w-full items-center overflow-hidden px-5 py-24 sm:px-8 sm:py-28 lg:min-h-screen lg:px-12"
    >
      <div className="scroll-reveal mx-auto flex w-full max-w-6xl flex-col items-center text-center">
        <p className="break-keep text-lg font-medium tracking-[-0.01em] text-white/55 sm:text-xl">
          아이디어를 현실로 만드는 여정,
        </p>
        <h2
          id="recruit-title"
          className="mt-4 max-w-5xl text-balance break-keep text-[clamp(38px,5.2vw,68px)] font-semibold leading-[1.12] tracking-[-0.035em] text-white"
        >
          <span className="text-accent">멋쟁이사자처럼</span>과 함께할 아기사자를 기다립니다
        </h2>

        {/* 모집 중이면 지원폼으로, 평소엔 알림 신청 CTA → 클릭 시 이메일 폼 노출 */}
        <div className="mt-9 flex w-full justify-center sm:mt-11">
          {recruiting ? (
            <Link
              href="/apply"
              className="group inline-flex min-h-14 items-center justify-center gap-2.5 rounded-full bg-accent px-7 text-[15px] font-semibold text-white outline-none transition-[background-color,transform] hover:-translate-y-0.5 hover:bg-[#ff6a35] focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-4 focus-visible:ring-offset-[#171717] sm:px-8 sm:text-base"
            >
              지원서 작성하기
              <svg
                aria-hidden
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                className="size-4 transition-transform group-hover:translate-x-0.5"
              >
                <path
                  d="M5 12h14M13 6l6 6-6 6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </Link>
          ) : open ? (
            <NotificationForm onClose={() => setOpen(false)} />
          ) : (
            <button
              type="button"
              onClick={() => setOpen(true)}
              aria-label="모집 시작 알림 받기"
              className="group inline-flex min-h-14 items-center justify-center gap-2.5 rounded-full bg-accent px-7 text-[15px] font-semibold text-white outline-none transition-[background-color,transform] hover:-translate-y-0.5 hover:bg-[#ff6a35] focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-4 focus-visible:ring-offset-[#171717] sm:px-8 sm:text-base"
            >
              모집 시작 알림 받기
              <svg
                aria-hidden
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                className="size-4 transition-transform group-hover:translate-x-0.5"
              >
                <path
                  d="M5 12h14M13 6l6 6-6 6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
