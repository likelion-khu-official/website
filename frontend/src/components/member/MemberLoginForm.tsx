'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { login, changePassword, MemberApiError } from '@/lib/memberApi';
import { validateAdminPassword } from '@/lib/adminValidation';
import type { MemberAuthRole } from '@shared/types/member-auth';

/** role별 로그인 후 이동 경로. BE가 MemberAuthRole에 값을 추가하면 여기 채워야 컴파일된다. */
const ROLE_HOME: Record<MemberAuthRole, string> = {
  MEMBER: '/member',
};

function loginErrorMessage(err: unknown): string {
  if (err instanceof MemberApiError) {
    if (err.code === 'INVALID_CREDENTIALS') return '학번 또는 비밀번호가 올바르지 않아요.';
    if (err.code === 'ACCOUNT_LOCKED') return '계정이 잠겼어요. 관리자에게 문의해 주세요.';
    return err.message || '로그인에 실패했어요.';
  }
  return '로그인에 실패했어요.';
}

function changePasswordErrorMessage(err: unknown): string {
  if (err instanceof MemberApiError) {
    if (err.code === 'INVALID_CREDENTIALS') return '현재 비밀번호가 올바르지 않아요.';
    if (err.code === 'WEAK_PASSWORD') return '비밀번호가 정책을 만족하지 않아요.';
    return err.message || '비밀번호 변경에 실패했어요.';
  }
  return '비밀번호 변경에 실패했어요.';
}

type Step = 'login' | 'change-password';

export default function MemberLoginForm() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('login');

  const [studentId, setStudentId] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // 첫 로그인 강제 변경 단계 — 로그인 때 입력한 password를 currentPassword로 그대로 재사용
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  function goHome(role: MemberAuthRole) {
    router.push(ROLE_HOME[role]);
    router.refresh();
  }

  async function handleLoginSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError('');
    try {
      const { member } = await login({ studentId: studentId.trim(), password });
      if (member.mustChangePassword) {
        setStep('change-password');
        return;
      }
      goHome(member.role);
    } catch (err) {
      setError(loginErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleChangePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setError('');

    const passwordError = validateAdminPassword(newPassword);
    if (passwordError) {
      setError(passwordError);
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('비밀번호가 일치하지 않아요.');
      return;
    }

    setSubmitting(true);
    try {
      const { member } = await changePassword({ currentPassword: password, newPassword });
      goHome(member.role);
    } catch (err) {
      setError(changePasswordErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  if (step === 'change-password') {
    return (
      <div className="mx-auto flex min-h-[70vh] max-w-sm flex-col justify-center">
        <h1 className="mb-1 text-2xl font-bold text-white">비밀번호 변경</h1>
        <p className="mb-8 text-sm text-muted">첫 로그인이에요. 새 비밀번호를 설정해 주세요.</p>

        <form onSubmit={handleChangePasswordSubmit} className="flex flex-col gap-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-white" htmlFor="new-password">
              새 비밀번호
            </label>
            <input
              id="new-password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              autoComplete="new-password"
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none focus:border-white/30"
            />
            <p className="mt-1 text-xs text-muted">8자 이상, 영문과 숫자를 포함해 주세요.</p>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-white" htmlFor="new-password-confirm">
              새 비밀번호 확인
            </label>
            <input
              id="new-password-confirm"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              autoComplete="new-password"
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none focus:border-white/30"
            />
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="mt-2 rounded-full border border-white/20 bg-white/10 px-6 py-2.5 text-sm text-white transition-colors hover:bg-white/20 disabled:opacity-40"
          >
            {submitting ? '변경 중…' : '비밀번호 변경'}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-sm flex-col justify-center">
      <h1 className="mb-8 text-2xl font-bold text-white">멤버 로그인</h1>

      <form onSubmit={handleLoginSubmit} className="flex flex-col gap-4">
        <div>
          <label className="mb-2 block text-sm font-medium text-white" htmlFor="login-student-id">
            학번
          </label>
          <input
            id="login-student-id"
            type="text"
            value={studentId}
            onChange={(e) => setStudentId(e.target.value)}
            required
            autoComplete="username"
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
        href="/member/forgot-password"
        className="mt-5 text-center text-sm text-muted transition-colors hover:text-white"
      >
        비밀번호를 잊으셨나요?
      </Link>
    </div>
  );
}
