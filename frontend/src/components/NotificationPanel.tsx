'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import NotificationForm from '@/components/NotificationForm';

type Props = {
  open: boolean;
  onClose: () => void;
};

// 닫힘 애니메이션이 끝난 뒤 언마운트하기까지의 시간(ms). transition duration과 맞춘다.
const CLOSE_MS = 300;

/**
 * 모집 알림 신청 폼을 오버레이로 띄우는 래퍼.
 * - 데스크탑(sm↑): 왼쪽에서 슬라이드로 들어오는 사이드 패널. 배경 딤이 헤더까지 덮는다.
 * - 모바일: 아래에서 올라오는 바텀시트.
 * 폼 자체(NotificationForm)는 마감 페이지에서 인라인으로도 재사용하므로 오버레이 로직은 여기 둔다.
 */
export default function NotificationPanel({ open, onClose }: Props) {
  const [shown, setShown] = useState(false); // 슬라이드-인 상태(transform 토글)
  const [closing, setClosing] = useState(false); // 닫힘 애니메이션 동안 마운트 유지
  const [prevOpen, setPrevOpen] = useState(open);
  const panelRef = useRef<HTMLDivElement>(null);
  const lastTriggerRef = useRef<Element | null>(null);

  const rendered = open || closing;

  // 프롭 변화에 맞춰 렌더 중 상태 조정(React 권장 — effect 안 setState 대신).
  if (open !== prevOpen) {
    setPrevOpen(open);
    // 열릴 땐 아래 rAF가 다시 true로 올려 슬라이드-인, 닫힐 땐 false로 슬라이드-아웃.
    setShown(false);
    // 닫히는 동안엔 언마운트를 미뤄 exit 애니메이션을 보여준다.
    setClosing(!open);
  }

  // 슬라이드-인: 마운트된 다음 프레임에 transform을 해제한다.
  useEffect(() => {
    if (!open) return;
    lastTriggerRef.current = document.activeElement;
    const raf = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(raf);
  }, [open]);

  // 닫힘 애니메이션이 끝나면 언마운트한다.
  useEffect(() => {
    if (open || !closing) return;
    const timer = setTimeout(() => setClosing(false), CLOSE_MS);
    return () => clearTimeout(timer);
  }, [open, closing]);

  // 떠 있는 동안 스크롤 락 + ESC 닫기.
  useEffect(() => {
    if (!rendered) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [rendered, onClose]);

  // 열리면 첫 입력(이메일)로 포커스 이동.
  useEffect(() => {
    if (shown) {
      panelRef.current?.querySelector<HTMLElement>('input[type="email"]')?.focus();
    }
  }, [shown]);

  // 완전히 닫히면 원래 트리거(CTA 버튼)로 포커스 복귀.
  useEffect(() => {
    if (!rendered && lastTriggerRef.current instanceof HTMLElement) {
      lastTriggerRef.current.focus();
    }
  }, [rendered]);

  if (!rendered) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100]"
      role="dialog"
      aria-modal="true"
      aria-label="모집 시작 알림 신청"
    >
      {/* 배경 딤 — 헤더까지 덮는다(z-[100] > 헤더 z-20). 클릭하면 닫힘. */}
      <button
        type="button"
        tabIndex={-1}
        aria-label="배경을 눌러 알림 신청 닫기"
        onClick={onClose}
        className={`absolute inset-0 cursor-default bg-black/70 backdrop-blur-md transition-opacity duration-300 ease-[var(--motion-ease-out)] motion-reduce:transition-none ${
          shown ? 'opacity-100' : 'opacity-0'
        }`}
      />

      {/* 패널 — 모바일: 화면 덮는 바텀시트(아래→위) / 데스크탑: 오른쪽에서 들어오는 풀하이트 사이드 패널(오른쪽) */}
      <div
        ref={panelRef}
        className={`absolute inset-x-0 bottom-0 overflow-hidden rounded-t-3xl border border-white/10 bg-[#171717] shadow-[0_-24px_90px_rgba(0,0,0,0.5)] transition-transform duration-300 ease-[var(--motion-ease-out)] will-change-transform motion-reduce:transition-none sm:inset-y-0 sm:left-auto sm:right-0 sm:h-full sm:w-full sm:max-w-[34rem] sm:rounded-none sm:border-y-0 sm:border-r-0 sm:border-l sm:shadow-[-24px_0_90px_rgba(0,0,0,0.55)] ${
          shown
            ? 'translate-y-0 sm:translate-x-0'
            : 'translate-y-full sm:translate-y-0 sm:translate-x-full'
        }`}
      >
        <NotificationForm variant="panel" onClose={onClose} analyticsLocation="LANDING_RECRUIT" />
      </div>
    </div>,
    document.body,
  );
}
