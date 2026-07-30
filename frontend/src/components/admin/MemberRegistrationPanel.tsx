'use client';

import { useState } from 'react';
import { AdminApiError, createMember, createMembersBulk } from '@/lib/adminApi';
import {
  BULK_MEMBER_EXAMPLE,
  BulkMemberValidationError,
  MEMBER_ROLE_OPTIONS,
  parseBulkMembers,
} from '@/lib/memberRegistration';
import type { MemberAdminSummary, MemberCreateRequest, MemberRole } from '@shared/types/member';

type RegistrationMode = 'single' | 'bulk';

interface MemberRegistrationPanelProps {
  onCreated: (members: MemberAdminSummary[]) => void;
}

const emptyForm = { name: '', studentId: '', phone: '', cohort: '', roles: [] as MemberRole[] };

const inputClass =
  'min-h-11 rounded-xl border border-white/10 bg-black/20 px-4 py-2.5 text-sm text-white outline-none placeholder:text-white/35 focus:border-white/30 focus-visible:ring-2 focus-visible:ring-accent/60';

export default function MemberRegistrationPanel({ onCreated }: MemberRegistrationPanelProps) {
  const [mode, setMode] = useState<RegistrationMode>('single');
  const [singleForm, setSingleForm] = useState(emptyForm);
  const [bulkInput, setBulkInput] = useState('');
  const [bulkPreview, setBulkPreview] = useState<MemberCreateRequest[] | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [copied, setCopied] = useState(false);

  function changeMode(nextMode: RegistrationMode) {
    setMode(nextMode);
    setError('');
    setSuccess('');
  }

  function toggleRole(role: MemberRole) {
    setSingleForm((previous) => ({
      ...previous,
      roles: previous.roles.includes(role)
        ? previous.roles.filter((item) => item !== role)
        : [...previous.roles, role],
    }));
  }

  async function handleSingleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (submitting) return;

    setSubmitting(true);
    setError('');
    setSuccess('');
    try {
      const created = await createMember({
        name: singleForm.name.trim(),
        studentId: singleForm.studentId.trim(),
        phone: singleForm.phone.trim(),
        cohort: Number(singleForm.cohort),
        roles: singleForm.roles,
      });
      onCreated([created]);
      setSingleForm(emptyForm);
      setSuccess(`${created.name} 멤버를 등록했어요.`);
    } catch (caught) {
      setError(caught instanceof AdminApiError ? caught.message : '등록에 실패했어요.');
    } finally {
      setSubmitting(false);
    }
  }

  function validateBulkInput() {
    setError('');
    setSuccess('');
    try {
      const members = parseBulkMembers(bulkInput);
      setBulkPreview(members);
    } catch (caught) {
      setBulkPreview(null);
      setError(
        caught instanceof BulkMemberValidationError
          ? caught.message
          : '입력값을 확인하지 못했어요.'
      );
    }
  }

  async function handleBulkSubmit() {
    if (submitting) return;

    let members: MemberCreateRequest[];
    try {
      members = parseBulkMembers(bulkInput);
    } catch (caught) {
      setBulkPreview(null);
      setError(
        caught instanceof BulkMemberValidationError
          ? caught.message
          : '입력값을 확인하지 못했어요.'
      );
      return;
    }

    setSubmitting(true);
    setError('');
    setSuccess('');
    try {
      const response = await createMembersBulk(members);
      onCreated(response.members);
      setBulkInput('');
      setBulkPreview(null);
      setSuccess(`${response.count}명의 멤버를 한 번에 등록했어요.`);
    } catch (caught) {
      setError(caught instanceof AdminApiError ? caught.message : '여러 명 등록에 실패했어요.');
    } finally {
      setSubmitting(false);
    }
  }

  async function copyExample() {
    try {
      await navigator.clipboard.writeText(BULK_MEMBER_EXAMPLE);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setError('예시를 복사하지 못했어요. 아래 코드를 직접 선택해주세요.');
    }
  }

  return (
    <section className="mb-8 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04]">
      <div className="border-b border-white/10 p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">Member registration</p>
        <h2 className="mt-2 text-xl font-semibold text-white">새 멤버 등록</h2>
        <p className="mt-2 text-sm leading-6 text-muted">
          학번은 로그인 아이디, 전화번호는 첫 비밀번호로 사용돼요. 첫 로그인 뒤에는 비밀번호 변경이 필요합니다.
        </p>
      </div>

      <div className="p-5">
        <div
          role="tablist"
          aria-label="멤버 등록 방식"
          className="mb-6 grid grid-cols-2 rounded-xl border border-white/10 bg-black/20 p-1"
        >
          {([
            ['single', '한 명 등록'],
            ['bulk', '여러 명 등록'],
          ] as const).map(([value, label]) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={mode === value}
              onClick={() => changeMode(value)}
              className={`min-h-11 rounded-lg px-4 py-2 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-accent ${
                mode === value ? 'bg-white text-black' : 'text-muted hover:text-white'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {mode === 'single' ? (
          <form onSubmit={handleSingleSubmit} className="flex flex-col gap-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="flex flex-col gap-2 text-sm text-white">
                이름 <span className="sr-only">(필수)</span>
                <input
                  value={singleForm.name}
                  onChange={(event) => setSingleForm((previous) => ({ ...previous, name: event.target.value }))}
                  placeholder="홍길동"
                  required
                  className={inputClass}
                />
              </label>
              <label className="flex flex-col gap-2 text-sm text-white">
                학번 <span className="text-xs text-muted">로그인 아이디</span>
                <input
                  value={singleForm.studentId}
                  onChange={(event) =>
                    setSingleForm((previous) => ({ ...previous, studentId: event.target.value }))
                  }
                  placeholder="2026123456"
                  inputMode="numeric"
                  autoComplete="off"
                  required
                  className={inputClass}
                />
              </label>
              <label className="flex flex-col gap-2 text-sm text-white">
                전화번호 <span className="text-xs text-muted">첫 비밀번호</span>
                <input
                  value={singleForm.phone}
                  onChange={(event) => setSingleForm((previous) => ({ ...previous, phone: event.target.value }))}
                  placeholder="01012345678"
                  type="tel"
                  autoComplete="off"
                  required
                  className={inputClass}
                />
              </label>
              <label className="flex flex-col gap-2 text-sm text-white">
                기수 <span className="sr-only">(필수)</span>
                <input
                  value={singleForm.cohort}
                  onChange={(event) => setSingleForm((previous) => ({ ...previous, cohort: event.target.value }))}
                  placeholder="14"
                  type="number"
                  min="1"
                  required
                  className={inputClass}
                />
              </label>
            </div>

            <fieldset>
              <legend className="mb-3 text-sm text-white">
                역할 <span className="text-xs text-muted">한 개 이상 선택</span>
              </legend>
              <div className="flex flex-wrap gap-2">
                {MEMBER_ROLE_OPTIONS.map(({ value, label }) => {
                  const selected = singleForm.roles.includes(value);
                  return (
                    <button
                      type="button"
                      key={value}
                      aria-pressed={selected}
                      onClick={() => toggleRole(value)}
                      className={`min-h-11 rounded-full border px-3 py-2 text-left text-xs outline-none transition-colors focus-visible:ring-2 focus-visible:ring-accent ${
                        selected
                          ? 'border-white/50 bg-white text-black'
                          : 'border-white/10 bg-white/5 text-muted hover:border-white/30 hover:text-white'
                      }`}
                    >
                      <span className="font-medium">{label}</span>
                      <span className={`ml-1.5 ${selected ? 'text-black/55' : 'text-white/35'}`}>{value}</span>
                    </button>
                  );
                })}
              </div>
            </fieldset>

            <button
              type="submit"
              disabled={submitting || singleForm.roles.length === 0}
              className="min-h-11 self-start rounded-full bg-white px-6 py-2.5 text-sm font-semibold text-black outline-none transition-opacity hover:opacity-85 focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-not-allowed disabled:opacity-40"
            >
              {submitting ? '등록 중…' : '멤버 등록'}
            </button>
          </form>
        ) : (
          <div className="flex flex-col gap-5">
            <div className="rounded-xl border border-white/10 bg-black/20 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-white">붙여넣을 JSON 형식</h3>
                  <p className="mt-1 text-xs leading-5 text-muted">
                    학번과 전화번호는 앞자리 0이 사라지지 않도록 따옴표로 감싼 문자열이어야 해요.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={copyExample}
                  className="min-h-11 rounded-full border border-white/15 px-4 py-2 text-xs text-white outline-none hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-accent"
                >
                  {copied ? '복사했어요' : '예시 복사'}
                </button>
              </div>
              <pre className="mt-4 max-h-72 overflow-auto rounded-lg bg-black/40 p-4 text-xs leading-5 text-white/75">
                <code>{BULK_MEMBER_EXAMPLE}</code>
              </pre>
            </div>

            <details className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
              <summary className="cursor-pointer text-sm font-medium text-white">사용할 수 있는 역할 코드</summary>
              <div className="mt-4 grid gap-x-6 gap-y-2 sm:grid-cols-2">
                {MEMBER_ROLE_OPTIONS.map(({ value, label }) => (
                  <div key={value} className="flex items-center justify-between gap-3 text-xs">
                    <span className="text-muted">{label}</span>
                    <code className="text-white/75">{value}</code>
                  </div>
                ))}
              </div>
            </details>

            <label className="flex flex-col gap-2 text-sm text-white">
              멤버 JSON 배열
              <textarea
                value={bulkInput}
                onChange={(event) => {
                  setBulkInput(event.target.value);
                  setBulkPreview(null);
                  setError('');
                  setSuccess('');
                }}
                placeholder="위 형식의 JSON 배열을 여기에 붙여넣으세요."
                spellCheck={false}
                rows={14}
                className="resize-y rounded-xl border border-white/10 bg-black/25 px-4 py-3 font-mono text-sm leading-6 text-white outline-none placeholder:font-sans placeholder:text-white/35 focus:border-white/30 focus-visible:ring-2 focus-visible:ring-accent/60"
              />
            </label>

            {bulkPreview && (
              <div className="rounded-xl border border-emerald-400/25 bg-emerald-400/10 p-4" role="status">
                <p className="text-sm font-semibold text-emerald-200">
                  {bulkPreview.length}명의 입력을 확인했어요
                </p>
                <p className="mt-1 text-sm text-emerald-100/70">
                  {bulkPreview.map(({ name }) => name).join(', ')}
                </p>
                <p className="mt-2 text-xs text-emerald-100/55">
                  등록 중 한 명이라도 충돌하면 아무도 저장되지 않아요.
                </p>
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={validateBulkInput}
                disabled={!bulkInput.trim() || submitting}
                className="min-h-11 rounded-full border border-white/20 px-5 py-2.5 text-sm text-white outline-none hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-not-allowed disabled:opacity-40"
              >
                입력 검증
              </button>
              {bulkPreview && (
                <button
                  type="button"
                  onClick={handleBulkSubmit}
                  disabled={submitting}
                  className="min-h-11 rounded-full bg-white px-6 py-2.5 text-sm font-semibold text-black outline-none transition-opacity hover:opacity-85 focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {submitting ? '등록 중…' : `${bulkPreview.length}명 등록`}
                </button>
              )}
            </div>
          </div>
        )}

        {error && (
          <p role="alert" className="mt-5 rounded-xl border border-red-400/25 bg-red-400/10 px-4 py-3 text-sm text-red-200">
            {error}
          </p>
        )}
        {success && (
          <p role="status" className="mt-5 rounded-xl border border-emerald-400/25 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-200">
            {success}
          </p>
        )}
      </div>
    </section>
  );
}
