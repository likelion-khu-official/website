'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { verifyInvitation, acceptInvitation, AdminApiError } from '@/lib/adminApi';
import { validateAdminPassword } from '@/lib/adminValidation';
import NoticeScreen from './NoticeScreen';

type State = 'checking' | 'valid' | 'expired' | 'invalid' | 'error' | 'submitted';

export default function InviteAcceptForm({ token }: { token: string }) {
  const [state, setState] = useState<State>('checking');
  const [email, setEmail] = useState('');

  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await verifyInvitation(token);
        if (cancelled) return;
        setEmail(res.email);
        setState('valid');
      } catch (err) {
        if (cancelled) return;
        if (err instanceof AdminApiError && err.code === 'EXPIRED_TOKEN') setState('expired');
        else if (err instanceof AdminApiError && err.code === 'INVALID_TOKEN') setState('invalid');
        else setState('error');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setFormError('');

    const passwordError = validateAdminPassword(password);
    if (passwordError) {
      setFormError(passwordError);
      return;
    }
    if (password !== confirmPassword) {
      setFormError('비밀번호가 일치하지 않아요.');
      return;
    }
    if (!name.trim()) {
      setFormError('이름을 입력해 주세요.');
      return;
    }

    setSubmitting(true);
    try {
      await acceptInvitation(token, { name: name.trim(), password });
      setState('submitted');
    } catch (err) {
      setFormError(err instanceof AdminApiError ? err.message : '가입 처리에 실패했어요.');
    } finally {
      setSubmitting(false);
    }
  }

  if (state === 'checking') {
    return <p className="py-24 text-center text-sm text-muted">확인하고 있어요…</p>;
  }

  if (state === 'expired') {
    return (
      <NoticeScreen
        title="초대가 만료됐어요"
        description="이 초대 링크는 유효 시간이 지났어요. 운영진에게 새 초대를 요청해 주세요."
      />
    );
  }

  if (state === 'invalid') {
    return (
      <NoticeScreen title="유효하지 않은 링크예요" description="초대 링크가 올바르지 않아요. 링크를 다시 확인해 주세요." />
    );
  }

  if (state === 'error') {
    return (
      <NoticeScreen
        title="확인하지 못했어요"
        description="초대 상태를 확인하는 중 문제가 생겼어요. 잠시 후 다시 시도해 주세요."
      />
    );
  }

  if (state === 'submitted') {
    return (
      <NoticeScreen title="가입이 완료됐어요" description="이제 로그인 페이지에서 로그인할 수 있어요.">
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
      <h1 className="mb-1 text-2xl font-bold text-white">초대 수락</h1>
      <p className="mb-8 text-sm text-muted">{email} 계정으로 가입해요.</p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="mb-2 block text-sm font-medium text-white" htmlFor="invite-name">
            이름
          </label>
          <input
            id="invite-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none focus:border-white/30"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-white" htmlFor="invite-password">
            비밀번호
          </label>
          <input
            id="invite-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="new-password"
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none focus:border-white/30"
          />
          <p className="mt-1 text-xs text-muted">8자 이상, 영문과 숫자를 포함해 주세요.</p>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-white" htmlFor="invite-password-confirm">
            비밀번호 확인
          </label>
          <input
            id="invite-password-confirm"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            autoComplete="new-password"
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none focus:border-white/30"
          />
        </div>

        {formError && <p className="text-sm text-red-400">{formError}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="mt-2 rounded-full border border-white/20 bg-white/10 px-6 py-2.5 text-sm text-white transition-colors hover:bg-white/20 disabled:opacity-40"
        >
          {submitting ? '처리 중…' : '가입 완료'}
        </button>
      </form>
    </div>
  );
}
