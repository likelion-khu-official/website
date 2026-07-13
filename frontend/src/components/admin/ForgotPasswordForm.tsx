'use client';

import { useState } from 'react';
import Link from 'next/link';
import { forgotPassword, AdminApiError } from '@/lib/adminApi';
import NoticeScreen from './NoticeScreen';

export default function ForgotPasswordForm() {
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError('');
    try {
      await forgotPassword({ email: email.trim() });
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof AdminApiError ? err.message : '요청을 처리하지 못했어요.');
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <NoticeScreen
        title="메일이 발송되었어요"
        description="입력하신 이메일로 비밀번호 재설정 안내를 보냈어요. 메일함을 확인해 주세요."
      >
        <Link
          href="/admin/login"
          className="mt-4 inline-block rounded-full border border-white/20 bg-white/10 px-5 py-2 text-sm text-white transition-colors hover:bg-white/20"
        >
          로그인 페이지로 이동
        </Link>
      </NoticeScreen>
    );
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-sm flex-col justify-center">
      <h1 className="mb-1 text-2xl font-bold text-white">비밀번호 찾기</h1>
      <p className="mb-8 text-sm text-muted">가입한 이메일로 재설정 링크를 보내드려요.</p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="mb-2 block text-sm font-medium text-white" htmlFor="forgot-email">
            이메일
          </label>
          <input
            id="forgot-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none focus:border-white/30"
          />
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="mt-2 rounded-full border border-white/20 bg-white/10 px-6 py-2.5 text-sm text-white transition-colors hover:bg-white/20 disabled:opacity-40"
        >
          {submitting ? '보내는 중…' : '재설정 메일 보내기'}
        </button>
      </form>

      <Link href="/admin/login" className="mt-5 text-center text-sm text-muted transition-colors hover:text-white">
        로그인으로 돌아가기
      </Link>
    </div>
  );
}
