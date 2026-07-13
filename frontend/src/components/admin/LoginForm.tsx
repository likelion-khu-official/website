'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { login, AdminApiError } from '@/lib/adminApi';

function loginErrorMessage(err: unknown): string {
  if (err instanceof AdminApiError) {
    if (err.code === 'INVALID_CREDENTIALS') return '이메일 또는 비밀번호가 올바르지 않아요.';
    if (err.code === 'ACCOUNT_LOCKED') return '계정이 잠겼어요. 잠시 후 다시 시도하거나 운영진에게 문의해 주세요.';
    return err.message || '로그인에 실패했어요.';
  }
  return '로그인에 실패했어요.';
}

export default function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError('');
    try {
      await login({ email: email.trim(), password });
      router.push('/admin');
      router.refresh();
    } catch (err) {
      setError(loginErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-sm flex-col justify-center">
      <h1 className="mb-8 text-2xl font-bold text-white">어드민 로그인</h1>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="mb-2 block text-sm font-medium text-white" htmlFor="login-email">
            이메일
          </label>
          <input
            id="login-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none focus:border-white/30"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-white" htmlFor="login-password">
            비밀번호
          </label>
          <input
            id="login-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none focus:border-white/30"
          />
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="mt-2 rounded-full border border-white/20 bg-white/10 px-6 py-2.5 text-sm text-white transition-colors hover:bg-white/20 disabled:opacity-40"
        >
          {submitting ? '로그인 중…' : '로그인'}
        </button>
      </form>

      <Link
        href="/admin/forgot-password"
        className="mt-5 text-center text-sm text-muted transition-colors hover:text-white"
      >
        비밀번호를 잊으셨나요?
      </Link>
    </div>
  );
}
