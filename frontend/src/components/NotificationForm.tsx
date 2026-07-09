'use client';

import { useState } from 'react';
import type {
  NotificationSubscribeRequest,
  NotificationSubscribeResponse,
} from '@/types/notification';

type FormState = 'idle' | 'loading' | 'success' | 'error';

export default function NotificationForm() {
  const [email, setEmail] = useState('');
  const [state, setState] = useState<FormState>('idle');
  const [message, setMessage] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setState('loading');

    const body: NotificationSubscribeRequest = { email };

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
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 w-full max-w-sm mx-auto items-center">
      <div className="flex gap-2 w-full">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="이메일 주소를 입력해 주세요"
          required
          disabled={state === 'loading' || state === 'success'}
          className="flex-1 rounded-full border border-white/20 bg-white/5 px-5 py-2.5 text-sm text-white placeholder:text-muted outline-none focus:border-white/40 disabled:opacity-40"
        />
        <button
          type="submit"
          disabled={state === 'loading' || state === 'success'}
          className="rounded-full border border-white/20 bg-white/10 px-5 py-2.5 text-sm text-white whitespace-nowrap hover:bg-white/20 transition-colors disabled:opacity-40"
        >
          {state === 'loading' ? '신청 중…' : state === 'success' ? '완료' : '지원기간 신청 알림 받기'}
        </button>
      </div>
      {(state === 'success' || state === 'error') && (
        <p className={`text-sm ${state === 'success' ? 'text-accent' : 'text-red-400'}`}>
          {message}
        </p>
      )}
    </form>
  );
}
