'use client';

import { useState } from 'react';
import { AdminApiError, createMember, createMembersBulk } from '@/lib/adminApi';
import {
  BULK_MEMBER_PROMPT,
  BulkMemberValidationError,
  findMemberRegistrationConflict,
  memberRoleLabel,
  parseBulkMembers,
} from '@/lib/memberRegistration';
import type { MemberAdminSummary, MemberCreateRequest, MemberRole } from '@shared/types/member';

type RegistrationMode = 'single' | 'bulk';

interface MemberRegistrationPanelProps {
  existingMembers: MemberAdminSummary[];
  onCreated: (members: MemberAdminSummary[]) => void;
}

const emptyForm = {
  name: '',
  studentId: '',
  phone: '',
  cohort: '',
  roles: [] as MemberRole[],
};

const inputClass =
  'min-h-11 rounded-xl border border-white/10 bg-black/20 px-4 py-2.5 text-sm text-white outline-none placeholder:text-white/35 focus:border-white/30 focus-visible:ring-2 focus-visible:ring-accent/60';

const ROLE_GROUPS = [
  {
    title: '파트·세션',
    description: '활동 파트와 세션장 역할',
    roles: [
      'BACKEND',
      'FRONTEND',
      'DESIGN',
      'AI',
      'BACKEND_LEAD',
      'FRONTEND_LEAD',
      'DESIGN_LEAD',
      'AI_LEAD',
    ] as MemberRole[],
  },
  {
    title: '조직 운영',
    description: '대표단·기획부·홍보부 역할',
    roles: ['PRESIDENT', 'VICE_PRESIDENT', 'PLANNING_HEAD', 'PLANNING_MEMBER', 'PR_HEAD', 'PR_MEMBER'] as MemberRole[],
  },
] as const;

interface MemberDraft {
  name: string;
  studentId: string;
  cohort: string;
  roles: MemberRole[];
  missing: string[];
}

interface RosterPreviewProps {
  candidates: MemberCreateRequest[];
  draft?: MemberDraft;
  existingMembers: MemberAdminSummary[];
  validationError: string;
}

function RosterPreview({ candidates, draft, existingMembers, validationError }: RosterPreviewProps) {
  const pendingCount = candidates.length + (draft ? 1 : 0);

  return (
    <aside className="overflow-hidden rounded-2xl border border-white/10 bg-black/20 lg:sticky lg:top-6">
      <div className="border-b border-white/10 px-4 py-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-white">등록 미리보기</h3>
          <div className="flex gap-2 text-[11px]">
            <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-muted">
              기존 {existingMembers.length}
            </span>
            <span className="rounded-full border border-accent/30 bg-accent/10 px-2.5 py-1 text-accent">
              신규 {pendingCount}
            </span>
          </div>
        </div>
        <p className="mt-2 text-xs leading-5 text-muted">
          새로 입력한 멤버가 현재 부원 목록에 어떻게 추가될지 먼저 확인하세요.
        </p>
      </div>

      <div className="max-h-[42rem] space-y-4 overflow-y-auto p-4">
        {validationError && (
          <div
            role="alert"
            className="rounded-xl border border-red-400/30 bg-red-400/10 p-3 text-xs leading-5 text-red-200"
          >
            <p className="font-semibold">JSON을 미리볼 수 없어요</p>
            <p className="mt-1 text-red-100/75">{validationError}</p>
          </div>
        )}

        {draft && (
          <section aria-label="작성 중인 신규 부원">
            <p className="mb-2 text-xs font-semibold text-accent">신규 등록 예정</p>
            <div className="rounded-xl border border-dashed border-accent/30 bg-accent/[0.06] p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-white">{draft.name || '이름을 입력해주세요'}</p>
                  <p className="mt-0.5 text-xs text-white/55">
                    {draft.studentId || '학번 미입력'} · {draft.cohort ? `${draft.cohort}기` : '기수 미입력'}
                  </p>
                </div>
                <span className="shrink-0 rounded-full border border-accent/30 bg-accent/10 px-2 py-1 text-[10px] font-semibold text-accent">
                  입력 중
                </span>
              </div>
              <p className="mt-2 text-xs text-white/55">
                {draft.roles.length > 0 ? draft.roles.map(memberRoleLabel).join(' · ') : '역할을 선택해주세요'}
              </p>
              <p className="mt-2 text-[11px] text-amber-200/80">남은 항목: {draft.missing.join(' · ')}</p>
            </div>
          </section>
        )}

        {candidates.length > 0 && (
          <section aria-label="신규 등록 예정 부원">
            <p className="mb-2 text-xs font-semibold text-accent">신규 등록 예정</p>
            <ul className="space-y-2">
              {candidates.map((member, index) => {
                const conflict = findMemberRegistrationConflict(member, existingMembers);
                return (
                  <li
                    key={`${member.studentId}-${index}`}
                    className={`rounded-xl border p-3 ${
                      conflict ? 'border-red-400/30 bg-red-400/10' : 'border-accent/30 bg-accent/10'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-white">{member.name}</p>
                        <p className="mt-0.5 text-xs text-white/55">
                          {member.studentId} · {member.cohort}기
                        </p>
                      </div>
                      <span
                        className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-semibold ${
                          conflict ? 'bg-red-300 text-red-950' : 'bg-accent text-black'
                        }`}
                      >
                        {conflict ? '등록 불가' : '신규'}
                      </span>
                    </div>
                    <p className="mt-2 text-xs text-white/65">{member.roles.map(memberRoleLabel).join(' · ')}</p>
                    {conflict && <p className="mt-2 text-xs text-red-200">{conflict}</p>}
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        <section aria-label="현재 등록된 부원">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-xs font-semibold text-white/75">현재 등록된 부원</p>
            <span className="text-[11px] text-muted">{existingMembers.length}명</span>
          </div>
          {existingMembers.length === 0 ? (
            <p className="rounded-xl border border-dashed border-white/10 px-3 py-6 text-center text-xs text-muted">
              아직 등록된 부원이 없어요.
            </p>
          ) : (
            <ul className="space-y-2">
              {existingMembers.map((member) => (
                <li key={member.id} className="rounded-xl border border-white/10 bg-white/[0.035] p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-white/90">{member.name}</p>
                      <p className="mt-0.5 text-xs text-white/45">
                        {member.studentId} · {member.cohort}기
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <span className="rounded-full border border-white/15 bg-white/5 px-2 py-1 text-[10px] text-white/60">
                        기존
                      </span>
                      {member.offboarded && (
                        <span className="rounded-full border border-amber-300/25 bg-amber-300/10 px-2 py-1 text-[10px] text-amber-200">
                          오프보딩
                        </span>
                      )}
                    </div>
                  </div>
                  <p className="mt-2 text-xs text-white/45">{member.roles.map(memberRoleLabel).join(' · ')}</p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </aside>
  );
}

export default function MemberRegistrationPanel({ existingMembers, onCreated }: MemberRegistrationPanelProps) {
  const [mode, setMode] = useState<RegistrationMode>('single');
  const [singleForm, setSingleForm] = useState(emptyForm);
  const [bulkInput, setBulkInput] = useState('');
  const [bulkPreview, setBulkPreview] = useState<MemberCreateRequest[] | null>(null);
  const [bulkValidationError, setBulkValidationError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [copied, setCopied] = useState(false);

  const singleCandidate =
    singleForm.name.trim() &&
    singleForm.studentId.trim() &&
    singleForm.phone.trim() &&
    Number(singleForm.cohort) > 0 &&
    singleForm.roles.length > 0
      ? [
          {
            name: singleForm.name.trim(),
            studentId: singleForm.studentId.trim(),
            phone: singleForm.phone.trim(),
            cohort: Number(singleForm.cohort),
            roles: singleForm.roles,
          },
        ]
      : [];
  const singleMissing = [
    !singleForm.name.trim() && '이름',
    !singleForm.studentId.trim() && '학번',
    !singleForm.phone.trim() && '전화번호',
    !(Number(singleForm.cohort) > 0) && '기수',
    singleForm.roles.length === 0 && '역할',
  ].filter(Boolean) as string[];
  const singleTouched =
    Boolean(singleForm.name || singleForm.studentId || singleForm.phone || singleForm.cohort) ||
    singleForm.roles.length > 0;
  const singleDraft =
    mode === 'single' && singleTouched && singleCandidate.length === 0
      ? {
          name: singleForm.name.trim(),
          studentId: singleForm.studentId.trim(),
          cohort: singleForm.cohort,
          roles: singleForm.roles,
          missing: singleMissing,
        }
      : undefined;
  const previewCandidates = mode === 'bulk' ? (bulkPreview ?? []) : singleCandidate;
  const hasConflict = previewCandidates.some(
    (member) => findMemberRegistrationConflict(member, existingMembers) !== null
  );

  function changeMode(nextMode: RegistrationMode) {
    setMode(nextMode);
    setError('');
    setSuccess('');
    setBulkValidationError('');
  }

  function toggleRole(role: MemberRole) {
    setSingleForm((previous) => ({
      ...previous,
      roles: previous.roles.includes(role) ? previous.roles.filter((item) => item !== role) : [...previous.roles, role],
    }));
  }

  async function handleSingleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (submitting || hasConflict) return;

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
      setBulkValidationError('');
    } catch (caught) {
      setBulkPreview(null);
      setBulkValidationError(
        caught instanceof BulkMemberValidationError ? caught.message : '입력값을 확인하지 못했어요.'
      );
    }
  }

  function changeBulkInput(value: string) {
    setBulkInput(value);
    setError('');
    setSuccess('');

    if (!value.trim()) {
      setBulkPreview(null);
      setBulkValidationError('');
      return;
    }

    try {
      setBulkPreview(parseBulkMembers(value));
      setBulkValidationError('');
    } catch (caught) {
      setBulkPreview(null);
      setBulkValidationError(
        caught instanceof BulkMemberValidationError ? caught.message : '입력값을 확인하지 못했어요.'
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
      setBulkValidationError(
        caught instanceof BulkMemberValidationError ? caught.message : '입력값을 확인하지 못했어요.'
      );
      return;
    }

    const conflict = members.map((member) => findMemberRegistrationConflict(member, existingMembers)).find(Boolean);
    if (conflict) {
      setError(`기존 부원과 충돌하는 항목을 먼저 수정해주세요. ${conflict}`);
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
      setBulkValidationError('');
      setSuccess(`${response.count}명의 멤버를 한 번에 등록했어요.`);
    } catch (caught) {
      setError(caught instanceof AdminApiError ? caught.message : '여러 명 등록에 실패했어요.');
    } finally {
      setSubmitting(false);
    }
  }

  async function copyPrompt() {
    try {
      await navigator.clipboard.writeText(BULK_MEMBER_PROMPT);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setError('프롬프트를 복사하지 못했어요. 아래 프롬프트를 직접 선택해주세요.');
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
          {(
            [
              ['single', '한 명 등록'],
              ['bulk', '여러 명 등록'],
            ] as const
          ).map(([value, label]) => (
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

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)] lg:items-start">
          <div className="min-w-0">
            {mode === 'single' ? (
              <form onSubmit={handleSingleSubmit} className="flex flex-col gap-4">
                <section className="rounded-2xl border border-white/10 bg-black/15 p-4 sm:p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">기본 정보</p>
                      <h3 className="mt-1 text-base font-semibold text-white">로그인 계정에 필요한 정보</h3>
                      <p className="mt-1 text-xs leading-5 text-muted">
                        모든 항목은 필수이며 등록 후 학번은 바꿀 수 없어요.
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-muted">
                      {4 - singleMissing.filter((item) => item !== '역할').length}/4
                    </span>
                  </div>

                  <div className="mt-5 grid gap-4 sm:grid-cols-2">
                    <label className="flex flex-col gap-2 text-sm text-white">
                      이름 <span className="sr-only">(필수)</span>
                      <input
                        value={singleForm.name}
                        onChange={(event) =>
                          setSingleForm((previous) => ({
                            ...previous,
                            name: event.target.value,
                          }))
                        }
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
                          setSingleForm((previous) => ({
                            ...previous,
                            studentId: event.target.value,
                          }))
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
                        onChange={(event) =>
                          setSingleForm((previous) => ({
                            ...previous,
                            phone: event.target.value,
                          }))
                        }
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
                        onChange={(event) =>
                          setSingleForm((previous) => ({
                            ...previous,
                            cohort: event.target.value,
                          }))
                        }
                        placeholder="14"
                        type="number"
                        min="1"
                        required
                        className={inputClass}
                      />
                    </label>
                  </div>
                </section>

                <fieldset className="rounded-2xl border border-white/10 bg-black/15 p-4 sm:p-5">
                  <legend className="sr-only">역할 선택</legend>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">역할 선택</p>
                      <h3 className="mt-1 text-base font-semibold text-white">맡고 있는 역할을 모두 선택</h3>
                      <p className="mt-1 text-xs leading-5 text-muted">
                        파트와 운영 역할을 함께 맡고 있다면 여러 개 선택하세요.
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-muted">
                        {singleForm.roles.length}개 선택
                      </span>
                      {singleForm.roles.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setSingleForm((previous) => ({ ...previous, roles: [] }))}
                          className="min-h-8 rounded-full px-2 text-[11px] text-white/50 outline-none hover:text-white focus-visible:ring-2 focus-visible:ring-accent"
                        >
                          초기화
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="mt-5 space-y-5">
                    {ROLE_GROUPS.map((group) => (
                      <div key={group.title}>
                        <div className="mb-2">
                          <p className="text-sm font-medium text-white/85">{group.title}</p>
                          <p className="mt-0.5 text-[11px] text-white/40">{group.description}</p>
                        </div>
                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                          {group.roles.map((role) => {
                            const selected = singleForm.roles.includes(role);
                            return (
                              <button
                                type="button"
                                key={role}
                                aria-pressed={selected}
                                onClick={() => toggleRole(role)}
                                className={`flex min-h-11 items-center justify-between gap-2 rounded-xl border px-3 py-2 text-left text-xs outline-none transition-colors focus-visible:ring-2 focus-visible:ring-accent ${
                                  selected
                                    ? 'border-accent/50 bg-accent/15 text-white'
                                    : 'border-white/10 bg-white/[0.035] text-white/55 hover:border-white/25 hover:text-white'
                                }`}
                              >
                                <span className="font-medium">{memberRoleLabel(role)}</span>
                                <span
                                  aria-hidden="true"
                                  className={`flex size-4 shrink-0 items-center justify-center rounded-full text-[10px] ${
                                    selected ? 'bg-accent text-black' : 'border border-white/15 text-transparent'
                                  }`}
                                >
                                  ✓
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </fieldset>

                <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-medium text-white">
                        {hasConflict
                          ? '기존 부원과 학번이 겹쳐요'
                          : singleMissing.length > 0
                            ? `${singleMissing.join(' · ')} 입력이 필요해요`
                            : '등록할 준비가 됐어요'}
                      </p>
                      <p className="mt-1 text-xs text-muted">
                        {singleMissing.length > 0
                          ? '입력 내용은 오른쪽 미리보기에서 함께 확인할 수 있어요.'
                          : '등록하면 로그인 계정이 즉시 만들어집니다.'}
                      </p>
                    </div>
                    <button
                      type="submit"
                      disabled={submitting || singleMissing.length > 0 || hasConflict}
                      className="min-h-11 shrink-0 rounded-full bg-white px-6 py-2.5 text-sm font-semibold text-black outline-none transition-opacity hover:opacity-85 focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {submitting ? '등록 중…' : hasConflict ? '충돌 항목 확인' : '멤버 등록'}
                    </button>
                  </div>
                </div>
              </form>
            ) : (
              <div className="flex flex-col gap-5">
                <div>
                  <h3 className="text-base font-semibold text-white">AI로 등록용 JSON 만들기</h3>
                  <p className="mt-1 text-sm leading-6 text-muted">
                    JSON을 직접 작성하지 않아도 돼요. 아래 순서대로 ChatGPT나 평소 쓰는 AI에 명단을 맡기세요.
                  </p>
                </div>

                <ol className="flex flex-col gap-3">
                  <li className="rounded-xl border border-white/10 bg-black/20 p-4">
                    <div className="flex gap-3">
                      <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-white text-xs font-bold text-black">
                        1
                      </span>
                      <div>
                        <h4 className="text-sm font-semibold text-white">원본 명단을 준비하세요</h4>
                        <p className="mt-1 text-xs leading-5 text-muted">
                          각 사람의 이름·학번·전화번호·기수·역할이 필요해요. 표나 메모 그대로면 충분합니다.
                        </p>
                      </div>
                    </div>
                  </li>

                  <li className="rounded-xl border border-white/10 bg-black/20 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="flex min-w-0 gap-3">
                        <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-white text-xs font-bold text-black">
                          2
                        </span>
                        <div>
                          <h4 className="text-sm font-semibold text-white">변환 프롬프트를 복사하세요</h4>
                          <p className="mt-1 text-xs leading-5 text-muted">
                            필드 형식과 모든 역할 코드가 들어 있어요. 정보가 부족하면 AI가 필요한 것만 짧게 물어봅니다.
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={copyPrompt}
                        className="min-h-11 rounded-full bg-white px-5 py-2 text-xs font-semibold text-black outline-none transition-opacity hover:opacity-85 focus-visible:ring-2 focus-visible:ring-accent"
                      >
                        {copied ? '프롬프트 복사됨' : '프롬프트 복사'}
                      </button>
                    </div>
                  </li>

                  <li className="rounded-xl border border-white/10 bg-black/20 p-4">
                    <div className="flex gap-3">
                      <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-white text-xs font-bold text-black">
                        3
                      </span>
                      <div>
                        <h4 className="text-sm font-semibold text-white">ChatGPT 등에 붙여넣으세요</h4>
                        <p className="mt-1 text-xs leading-5 text-muted">
                          새 대화에 프롬프트를 보내고, 이어서 준비한 원본 명단을 붙여넣으세요. 빠진 정보가 있으면 AI가
                          먼저 물어봅니다.
                        </p>
                      </div>
                    </div>
                  </li>

                  <li className="rounded-xl border border-white/10 bg-black/20 p-4">
                    <div className="flex gap-3">
                      <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-white text-xs font-bold text-black">
                        4
                      </span>
                      <div>
                        <h4 className="text-sm font-semibold text-white">AI가 만든 JSON만 복사하세요</h4>
                        <p className="mt-1 text-xs leading-5 text-muted">
                          설명 문장은 빼고, 대괄호 <code className="text-white">[ ]</code>로 시작하고 끝나는 결과 전체를
                          복사합니다.
                        </p>
                      </div>
                    </div>
                  </li>

                  <li className="rounded-xl border border-accent/25 bg-accent/10 p-4">
                    <div className="flex gap-3">
                      <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-bold text-black">
                        5
                      </span>
                      <div>
                        <h4 className="text-sm font-semibold text-white">아래에 붙여넣고 검증하세요</h4>
                        <p className="mt-1 text-xs leading-5 text-white/60">
                          화면이 등록 전에 형식과 중복을 다시 확인합니다. 오류가 나면 메시지를 AI에게 보여주고 수정을
                          요청해도 돼요.
                        </p>
                      </div>
                    </div>
                  </li>
                </ol>

                <label className="flex flex-col gap-2 text-sm text-white">
                  멤버 JSON 배열
                  <textarea
                    value={bulkInput}
                    onChange={(event) => changeBulkInput(event.target.value)}
                    placeholder="위 형식의 JSON 배열을 여기에 붙여넣으세요."
                    spellCheck={false}
                    rows={14}
                    className="resize-y rounded-xl border border-white/10 bg-black/25 px-4 py-3 font-mono text-sm leading-6 text-white outline-none placeholder:font-sans placeholder:text-white/35 focus:border-white/30 focus-visible:ring-2 focus-visible:ring-accent/60"
                  />
                </label>

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
                      disabled={submitting || hasConflict}
                      className="min-h-11 rounded-full bg-white px-6 py-2.5 text-sm font-semibold text-black outline-none transition-opacity hover:opacity-85 focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {submitting ? '등록 중…' : hasConflict ? '충돌 항목 확인' : `${bulkPreview.length}명 등록`}
                    </button>
                  )}
                </div>
              </div>
            )}

            {error && (
              <p
                role="alert"
                className="mt-5 rounded-xl border border-red-400/25 bg-red-400/10 px-4 py-3 text-sm text-red-200"
              >
                {error}
              </p>
            )}
            {success && (
              <p
                role="status"
                className="mt-5 rounded-xl border border-emerald-400/25 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-200"
              >
                {success}
              </p>
            )}
          </div>

          <RosterPreview
            candidates={previewCandidates}
            draft={singleDraft}
            existingMembers={existingMembers}
            validationError={mode === 'bulk' ? bulkValidationError : ''}
          />
        </div>
      </div>
    </section>
  );
}
