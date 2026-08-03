'use client';

import { useState } from 'react';
import type {
  NotificationSubscribeRequest,
  NotificationSubscribeResponse,
} from '@/types/notification';
import { trackKeyClick } from '@/lib/publicAnalytics';
import { markRecruitAlertSubscribed } from '@/lib/recruitAlertSubscription';

type FormState = 'idle' | 'loading' | 'success' | 'error';

type Props = {
  onClose?: () => void;
  analyticsLocation?: 'LANDING_RECRUIT' | 'APPLICATION_CLOSED';
  // 'card' = 마감 페이지 인라인 카드(기본) · 'panel' = 오버레이 패널을 꽉 채우는 형태
  variant?: 'card' | 'panel';
};

export default function NotificationForm({
  onClose,
  analyticsLocation,
  variant = 'card',
}: Props) {
  const [email, setEmail] = useState('');
  const [agreed, setAgreed] = useState(false);
  // 봇 함정(honeypot, #69) — 화면에서 숨겨 사람은 못 채운다. 값이 차 오면 서버가 봇으로 보고 무시.
  const [website, setWebsite] = useState('');
  const [state, setState] = useState<FormState>('idle');
  const [message, setMessage] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    // 버튼 disabled로 이미 막지만, 폼 submit이 다른 경로(엔터 등)로 트리거돼도 동의 없인 못 나가게 이중 방어
    if (!agreed) return;
    if (analyticsLocation) trackKeyClick(`NOTIFICATION_${analyticsLocation}`);
    setState('loading');

    const body: NotificationSubscribeRequest = { email, privacyConsent: agreed, website };

    try {
      const res = await fetch('/api/notifications/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data: NotificationSubscribeResponse = await res.json();

      if (res.ok && data.success) {
        setState('success');
        setMessage(data.message ?? '알림 신청이 완료됐어요!');
        setEmail('');
        // 이 브라우저에서 신청했음을 기억해 CTA 표시를 바꾼다(이벤트로 구독자에게 전파).
        markRecruitAlertSubscribed();
      } else {
        setState('error');
        setMessage(data.message ?? '오류가 발생했어요. 다시 시도해 주세요.');
      }
    } catch {
      setState('error');
      setMessage('서버에 연결할 수 없어요. 잠시 후 다시 시도해 주세요.');
    }
  }

  const isPanel = variant === 'panel';
  const locked = state === 'loading' || state === 'success';
  const submitLabel =
    state === 'loading' ? '신청 중…' : state === 'success' ? '신청 완료' : '알림 신청하기';

  const emailLabel = (
    <label htmlFor="notification-email" className="block text-xs font-medium text-white/60">
      이메일 주소
    </label>
  );

  const emailInput = (
    <input
      id="notification-email"
      type="email"
      value={email}
      onChange={(e) => {
        setEmail(e.target.value);
        if (state === 'error') {
          setState('idle');
          setMessage('');
        }
      }}
      placeholder="name@example.com"
      required
      disabled={locked}
      className="min-h-12 w-full min-w-0 rounded-xl border border-white/14 bg-white/[0.05] px-4 text-sm text-white placeholder:text-white/25 outline-none transition-colors focus:border-accent/70 focus-visible:ring-2 focus-visible:ring-accent/40 disabled:opacity-40"
    />
  );

  const submitButton = (
    <button
      type="submit"
      disabled={!agreed || locked}
      className={
        isPanel
          ? 'min-h-[52px] w-full rounded-xl bg-accent px-5 text-sm font-semibold text-white outline-none transition-[background-color,opacity] hover:bg-[#ff6a35] focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:ring-offset-2 focus-visible:ring-offset-[#171717] disabled:cursor-not-allowed disabled:opacity-30'
          : 'min-h-12 w-full whitespace-nowrap rounded-xl bg-white px-5 text-sm font-semibold text-[#171717] outline-none transition-[background-color,opacity] hover:bg-white/90 focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-not-allowed disabled:opacity-30 sm:w-auto'
      }
    >
      {submitLabel}
    </button>
  );

  {
    /* 개인정보 수집·이용 동의 — 개인정보보호법 제15조가 요구하는 4가지 고지 (#68) */
  }
  const privacyNotice = (
    <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4 sm:p-5">
      <dl className="grid grid-cols-[76px_minmax(0,1fr)] gap-x-4 gap-y-2.5 text-xs leading-5">
        <dt className="text-white/35">수집 목적</dt>
        <dd className="text-white/65">모집 시작 안내 메일 발송</dd>
        <dt className="text-white/35">수집 항목</dt>
        <dd className="text-white/65">이메일 주소</dd>
        <dt className="text-white/35">보유 기간</dt>
        <dd className="break-keep text-white/65">모집 종료 시 또는 구독 해지 요청 시까지</dd>
      </dl>
      <p className="mt-3 break-keep text-xs leading-5 text-white/35">
        동의를 거부할 수 있으며, 거부 시 알림 메일을 받을 수 없어요.
      </p>
    </div>
  );

  const consentCheckbox = (
    <label className="flex min-h-12 cursor-pointer items-center gap-3 rounded-xl text-sm leading-6 text-white/85">
      {/* 커스텀 체크박스 — 네이티브를 appearance-none으로 숨기고 체크 표시를 오버레이한다. */}
      <span className="relative flex size-[22px] shrink-0 items-center justify-center">
        <input
          type="checkbox"
          checked={agreed}
          onChange={(e) => setAgreed(e.target.checked)}
          disabled={locked}
          className="peer size-[22px] shrink-0 cursor-pointer appearance-none rounded-md border border-white/25 bg-white/[0.05] outline-none transition-colors checked:border-accent checked:bg-accent hover:border-white/45 focus-visible:ring-2 focus-visible:ring-accent/60 disabled:cursor-not-allowed disabled:opacity-40"
        />
        <svg
          aria-hidden
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="3.5"
          className="pointer-events-none absolute size-3.5 text-white opacity-0 transition-opacity peer-checked:opacity-100 motion-reduce:transition-none"
        >
          <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      개인정보 수집·이용에 동의해요 <span className="text-accent">(필수)</span>
    </label>
  );

  const statusMessage =
    state === 'success' || state === 'error' ? (
      <p
        role={state === 'success' ? 'status' : 'alert'}
        className={`mt-3 text-sm ${state === 'success' ? 'text-accent' : 'text-red-400'}`}
      >
        {message}
      </p>
    ) : null;

  return (
    <form
      onSubmit={handleSubmit}
      className={
        isPanel
          ? 'flex max-h-[88svh] w-full flex-col overflow-y-auto bg-[#171717] p-6 text-left sm:h-full sm:max-h-none sm:p-9'
          : 'mx-auto w-full max-w-2xl rounded-2xl border border-white/12 bg-[#171717]/95 p-5 text-left shadow-[0_24px_90px_rgba(0,0,0,0.28)] backdrop-blur sm:p-6'
      }
    >
      {/* 봇 함정(honeypot, #69) — 사람의 탐색·키보드 순서에서는 숨기되 단순 폼 봇에는 남긴다. */}
      <div aria-hidden="true" className="absolute left-[-9999px] top-0 h-0 w-0 overflow-hidden">
        <label htmlFor="notification-website">Website</label>
        <input
          id="notification-website"
          type="text"
          name="website"
          tabIndex={-1}
          autoComplete="off"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
        />
      </div>

      <header className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <span className="mt-0.5 flex size-11 shrink-0 items-center justify-center rounded-2xl bg-accent/12 text-accent ring-1 ring-inset ring-accent/25">
            <svg
              aria-hidden
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              className="size-[22px]"
            >
              <path
                d="M6 8.5a6 6 0 0 1 12 0c0 6 2.5 7.5 2.5 7.5H3.5S6 14.5 6 8.5Z"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path d="M10 20a2 2 0 0 0 4 0" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-accent">
              Recruit alert
            </p>
            <h3 className="mt-1.5 text-xl font-semibold tracking-[-0.035em] text-white sm:text-2xl">
              모집 시작 알림
            </h3>
          </div>
        </div>
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            disabled={state === 'loading'}
            aria-label="알림 신청 닫기"
            className="flex size-11 shrink-0 items-center justify-center rounded-full border border-white/12 text-xl text-white/50 outline-none transition-colors hover:border-white/25 hover:text-white focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-40"
          >
            ×
          </button>
        ) : null}
      </header>

      <p className="mt-4 break-keep text-sm leading-6 text-white/50">
        다음 모집이 열리면 입력한 이메일로 한 번 알려드릴게요.
      </p>

      {isPanel ? (
        <div className="mt-8 flex flex-1 flex-col">
          <div>
            {emailLabel}
            <div className="mt-2">{emailInput}</div>
          </div>
          <div className="mt-6">{privacyNotice}</div>
          {/* 풀하이트 패널에선 동의·제출을 하단에 고정해 화면을 넉넉히 쓴다. */}
          <div className="mt-auto pt-8">
            {consentCheckbox}
            {statusMessage}
            <div className="mt-4">{submitButton}</div>
          </div>
        </div>
      ) : (
        <>
          <div className="mt-6">
            {emailLabel}
            <div className="mt-2 flex flex-col gap-2 sm:flex-row">
              <div className="min-w-0 flex-1">{emailInput}</div>
              {submitButton}
            </div>
          </div>
          <div className="mt-6">{privacyNotice}</div>
          <div className="mt-3">{consentCheckbox}</div>
          {statusMessage}
        </>
      )}
    </form>
  );
}
