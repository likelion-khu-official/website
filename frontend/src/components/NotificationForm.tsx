'use client';

import { useState } from 'react';
import type {
  NotificationSubscribeRequest,
  NotificationSubscribeResponse,
} from '@/types/notification';
import { trackKeyClick } from '@/lib/publicAnalytics';

type FormState = 'idle' | 'loading' | 'success' | 'error';

type Props = {
  onClose?: () => void;
  analyticsLocation?: 'LANDING_RECRUIT' | 'APPLICATION_CLOSED';
};

export default function NotificationForm({ onClose, analyticsLocation }: Props) {
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
      const res = await fetch(
        '/api/notifications/subscribe',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        }
      );
      const data: NotificationSubscribeResponse = await res.json();

      if (res.ok && data.success) {
        setState('success');
        setMessage(data.message ?? '알림 신청이 완료됐어요!');
        setEmail('');
      } else {
        setState('error');
        setMessage(data.message ?? '오류가 발생했어요. 다시 시도해 주세요.');
      }
    } catch {
      setState('error');
      setMessage('서버에 연결할 수 없어요. 잠시 후 다시 시도해 주세요.');
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mx-auto w-full max-w-2xl rounded-2xl border border-white/12 bg-[#171717]/95 p-5 text-left shadow-[0_24px_90px_rgba(0,0,0,0.28)] backdrop-blur sm:p-6"
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

      <header className="flex items-start justify-between gap-5">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-accent">
            Recruit alert
          </p>
          <h3 className="mt-2 text-xl font-semibold tracking-[-0.035em] text-white sm:text-2xl">
            모집 시작 알림
          </h3>
          <p className="mt-2 break-keep text-sm leading-6 text-white/45">
            다음 모집이 열리면 입력한 이메일로 한 번 알려드릴게요.
          </p>
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

      <div className="mt-6">
        <label htmlFor="notification-email" className="mb-2 block text-xs font-medium text-white/65">
          이메일 주소
        </label>
        <div className="flex flex-col gap-2 sm:flex-row">
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
            disabled={state === 'loading' || state === 'success'}
            className="min-h-12 min-w-0 flex-1 rounded-xl border border-white/14 bg-white/[0.045] px-4 text-sm text-white placeholder:text-white/25 outline-none transition-colors focus:border-accent/70 focus-visible:ring-2 focus-visible:ring-accent/40 disabled:opacity-40"
          />
          <button
            type="submit"
            disabled={!agreed || state === 'loading' || state === 'success'}
            className="min-h-12 w-full whitespace-nowrap rounded-xl bg-white px-5 text-sm font-semibold text-[#171717] outline-none transition-[background-color,opacity] hover:bg-white/90 focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-not-allowed disabled:opacity-30 sm:w-auto"
          >
            {state === 'loading' ? '신청 중…' : state === 'success' ? '신청 완료' : '알림 신청하기'}
          </button>
        </div>
      </div>

      {/* 개인정보 수집·이용 동의 — 개인정보보호법 제15조가 요구하는 4가지 고지 (#68) */}
      <div className="mt-6 border-y border-white/10 py-4">
        <dl className="grid grid-cols-[76px_minmax(0,1fr)] gap-x-4 gap-y-2 text-xs leading-5">
          <dt className="text-white/35">수집 목적</dt>
          <dd className="text-white/62">모집 시작 안내 메일 발송</dd>
          <dt className="text-white/35">수집 항목</dt>
          <dd className="text-white/62">이메일 주소</dd>
          <dt className="text-white/35">보유 기간</dt>
          <dd className="break-keep text-white/62">
            모집 종료 시 또는 구독 해지 요청 시까지
          </dd>
        </dl>
        <p className="mt-3 break-keep text-xs leading-5 text-white/35">
          동의를 거부할 수 있으며, 거부 시 알림 메일을 받을 수 없어요.
        </p>
      </div>

      <label className="mt-3 flex min-h-12 cursor-pointer items-center gap-3 rounded-lg px-1 text-sm leading-6 text-white/82 outline-none focus-within:ring-2 focus-within:ring-accent/50">
        <input
          type="checkbox"
          checked={agreed}
          onChange={(e) => setAgreed(e.target.checked)}
          disabled={state === 'loading' || state === 'success'}
          className="size-5 shrink-0 accent-[#f05a28]"
        />
        개인정보 수집·이용에 동의해요 <span className="text-accent">(필수)</span>
      </label>

      {state === 'success' || state === 'error' ? (
        <p
          role={state === 'success' ? 'status' : 'alert'}
          className={`mt-2 text-sm ${state === 'success' ? 'text-accent' : 'text-red-400'}`}
        >
          {message}
        </p>
      ) : null}
    </form>
  );
}
