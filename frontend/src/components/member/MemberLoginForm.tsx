'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { login, changePassword, MemberApiError } from '@/lib/memberApi';
import { validateAdminPassword } from '@/lib/adminValidation';
import type { MemberAuthRole } from '@shared/types/member-auth';
import { inputField, primaryButton } from './ui/styles';

/** role별 로그인 후 이동 경로. BE가 MemberAuthRole에 값을 추가하면 여기 채워야 컴파일된다. */
const ROLE_HOME: Record<MemberAuthRole, string> = {
  MEMBER: '/member/projects',
};

/** '/'로 시작하는 내부 경로만 허용 — '//evil.com'이나 '/\evil.com'처럼 '/'로 시작하지만
 * 실제로는 프로토콜 상대 URL(브라우저가 '\'를 '/'로 정규화해 외부로 튀는 open redirect)인
 * 경우를 막는다. */
function isSafeReturnTo(value: string | null): value is string {
  if (!value || !value.startsWith('/')) return false;
  const second = value[1];
  return second !== '/' && second !== '\\';
}

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
  const searchParams = useSearchParams();
  const [step, setStep] = useState<Step>('login');

  const [studentId, setStudentId] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // 첫 로그인 강제 변경 단계 — 로그인 때 입력한 password를 currentPassword로 그대로 재사용
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  function goHome(role: MemberAuthRole) {
    const returnTo = searchParams.get('returnTo');
    router.push(isSafeReturnTo(returnTo) ? returnTo : ROLE_HOME[role]);
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

  return (
    <div className="mx-auto flex min-h-[80svh] w-full max-w-sm flex-col justify-center">
      <div className="mb-8 flex flex-col items-center text-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="" className="h-10 w-auto object-contain" />
        <h1 className="mt-5 text-2xl font-semibold tracking-[-0.03em] text-white">
          {step === 'change-password' ? '비밀번호 변경' : '멤버 로그인'}
        </h1>
        <p className="mt-2 text-sm text-white/45">
          {step === 'change-password'
            ? '첫 로그인이에요. 새 비밀번호를 설정해 주세요.'
            : '멋쟁이사자처럼 경희대 멤버 공간'}
        </p>
      </div>

      <div className="rounded-3xl border border-white/10 bg-white/[0.025] p-6 sm:p-8">
        {step === 'change-password' ? (
          <form onSubmit={handleChangePasswordSubmit} className="flex flex-col gap-4">
            <Field
              id="new-password"
              label="새 비밀번호"
              type="password"
              value={newPassword}
              onChange={setNewPassword}
              autoComplete="new-password"
              hint="8자 이상, 영문과 숫자를 포함해 주세요."
            />
            <Field
              id="new-password-confirm"
              label="새 비밀번호 확인"
              type="password"
              value={confirmPassword}
              onChange={setConfirmPassword}
              autoComplete="new-password"
            />
            {error ? <p className="text-sm text-red-400">{error}</p> : null}
            <button type="submit" disabled={submitting} className={`mt-2 ${primaryButton}`}>
              {submitting ? '변경 중…' : '비밀번호 변경'}
            </button>
          </form>
        ) : (
          <>
            <form onSubmit={handleLoginSubmit} className="flex flex-col gap-4">
              <Field
                id="login-student-id"
                label="학번"
                type="text"
                value={studentId}
                onChange={setStudentId}
                autoComplete="username"
              />
              <Field
                id="login-password"
                label="비밀번호"
                type="password"
                value={password}
                onChange={setPassword}
                autoComplete="current-password"
              />
              {error ? <p className="text-sm text-red-400">{error}</p> : null}
              <button type="submit" disabled={submitting} className={`mt-2 ${primaryButton}`}>
                {submitting ? '로그인 중…' : '로그인'}
              </button>
            </form>

            <Link
              href="/member/forgot-password"
              className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-lg text-center text-sm text-white/45 outline-none transition-colors hover:text-white focus-visible:ring-2 focus-visible:ring-accent"
            >
              비밀번호를 잊으셨나요?
            </Link>
          </>
        )}
      </div>
    </div>
  );
}

function Field({
  id,
  label,
  type,
  value,
  onChange,
  autoComplete,
  hint,
}: {
  id: string;
  label: string;
  type: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: string;
  hint?: string;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-white" htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required
        autoComplete={autoComplete}
        className={inputField}
      />
      {hint ? <p className="mt-1 text-xs text-white/40">{hint}</p> : null}
    </div>
  );
}
