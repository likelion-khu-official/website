'use client';

import { useState } from 'react';
import type {
  NotificationSubscribeRequest,
  NotificationSubscribeResponse,
} from '@/types/notification';

type FormState = 'idle' | 'loading' | 'success' | 'error';

export default function NotificationForm() {
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
    <form onSubmit={handleSubmit} className="mx-auto flex w-full max-w-xl flex-col items-center gap-3">
      {/* 봇 함정(honeypot, #69) — 화면 밖으로 숨겨 사람은 못 채운다. 봇이 채우면 서버가 조용히 무시.
          display:none 대신 화면 밖 배치 + aria-hidden + tabIndex -1로, 폼을 훑는 순진한 봇에게만 노출 */}
      <div aria-hidden="true" className="absolute left-[-9999px] top-0 h-0 w-0 overflow-hidden">
        <label htmlFor="website">Website</label>
        <input
          id="website"
          type="text"
          name="website"
          tabIndex={-1}
          autoComplete="off"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
        />
      </div>

      <div className="flex w-full flex-col gap-2 sm:flex-row">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="이메일 주소를 입력해 주세요"
          required
          disabled={state === 'loading' || state === 'success'}
          className="min-h-11 min-w-0 flex-1 rounded-full border border-white/20 bg-white/5 px-5 py-2.5 text-sm text-white placeholder:text-muted outline-none focus:border-white/40 focus-visible:ring-2 focus-visible:ring-accent/60 disabled:opacity-40"
        />
        <button
          type="submit"
          disabled={!agreed || state === 'loading' || state === 'success'}
          className="min-h-11 w-full whitespace-nowrap rounded-full border border-white/20 bg-white/10 px-5 py-2.5 text-sm text-white outline-none transition-colors hover:bg-white/20 focus-visible:ring-2 focus-visible:ring-accent/60 disabled:opacity-40 sm:w-auto"
        >
          {state === 'loading' ? '신청 중…' : state === 'success' ? '완료' : '지원기간 신청 알림 받기'}
        </button>
      </div>

      {/* 개인정보 수집·이용 동의 — 개인정보보호법 제15조가 요구하는 4가지 고지 (#68) */}
      <div className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-left">
        <ul className="mb-2 flex flex-col gap-0.5 text-xs text-muted">
          <li>· 수집 목적 — 모집 시작 안내 메일 발송</li>
          <li>· 수집 항목 — 이메일 주소</li>
          <li>· 보유 기간 — 모집 종료 시 또는 구독 해지 요청 시까지</li>
          <li>· 동의를 거부할 수 있으며, 거부 시 알림 메일을 받을 수 없어요</li>
        </ul>
        <label className="flex min-h-11 cursor-pointer items-start gap-2 py-1 text-sm leading-6 text-white">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            disabled={state === 'loading' || state === 'success'}
            className="mt-1 h-4 w-4 shrink-0 accent-white"
          />
          개인정보 수집·이용에 동의해요 (필수)
        </label>
      </div>
      {(state === 'success' || state === 'error') && (
        <p className={`text-sm ${state === 'success' ? 'text-accent' : 'text-red-400'}`}>
          {message}
        </p>
      )}
    </form>
  );
}
