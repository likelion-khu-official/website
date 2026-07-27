'use client';

import { useMemo, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import type { MemberAccount } from '@shared/types/member-auth';
import type { Member } from '@shared/types/member';
import type {
  ProjectDetail,
  ProjectImageRequest,
  ProjectParticipantRequest,
  ProjectPart,
} from '@shared/types/project';
import {
  createProject,
  MemberApiError,
  replaceProject,
  uploadProjectImage,
} from '@/lib/memberApi';

const PARTS: ProjectPart[] = [
  'PRESIDENT', 'VICE_PRESIDENT',
  'BACKEND_LEAD', 'FRONTEND_LEAD', 'DESIGN_LEAD', 'AI_LEAD',
  'PLANNING_HEAD', 'PLANNING_MEMBER',
  'PR_HEAD', 'PR_MEMBER',
  'BACKEND', 'FRONTEND', 'DESIGN', 'AI',
];
const ALLOWED_IMAGE_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif']);
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

type Props = {
  currentMember: MemberAccount;
  members: Member[];
  initialProject?: ProjectDetail;
};

function suggestedPart(member: Member | undefined): ProjectPart {
  return member?.roles[0] ?? 'BACKEND';
}

function apiErrorMessage(error: unknown) {
  if (error instanceof MemberApiError) {
    if (error.code === 'MUST_CHANGE_PASSWORD') {
      return '비밀번호를 먼저 변경해야 프로젝트를 저장할 수 있어요.';
    }
    if (error.code === 'SELF_NOT_INCLUDED') return '본인을 참여자에 포함해 주세요.';
    if (error.code === 'DUPLICATE_PARTICIPANT') return '같은 참여자를 두 번 추가할 수 없어요.';
    if (error.code === 'INVALID_REPRESENTATIVE_IMAGE') {
      return '대표 이미지를 정확히 한 장 선택해 주세요.';
    }
    if (error.code === 'NOT_PARTICIPANT') return '이 프로젝트를 수정할 권한이 없어요.';
    return error.message;
  }
  return '프로젝트를 저장하지 못했어요.';
}

export default function ProjectForm({ currentMember, members, initialProject }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const editing = Boolean(initialProject);
  const currentProfile = members.find((member) => member.id === currentMember.id);

  const [title, setTitle] = useState(initialProject?.title ?? '');
  const [summary, setSummary] = useState(initialProject?.summary ?? '');
  const [cohort, setCohort] = useState(String(initialProject?.cohort ?? currentProfile?.cohort ?? 14));
  const [startDate, setStartDate] = useState(initialProject?.startDate ?? '');
  const [endDate, setEndDate] = useState(initialProject?.endDate ?? '');
  const [githubUrl, setGithubUrl] = useState(initialProject?.githubUrl ?? '');
  const [techStack, setTechStack] = useState(initialProject?.techStack.join(', ') ?? '');
  const [images, setImages] = useState<ProjectImageRequest[]>(initialProject?.images ?? []);
  const [participants, setParticipants] = useState<ProjectParticipantRequest[]>(
    initialProject?.participants.map(({ memberId, part }) => ({ memberId, part })) ?? [
      { memberId: currentMember.id, part: suggestedPart(currentProfile) },
    ]
  );
  const [memberToAdd, setMemberToAdd] = useState('');
  const [uploadingCount, setUploadingCount] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const memberById = useMemo(
    () => new Map(members.map((member) => [member.id, member])),
    [members]
  );
  const initialNameById = useMemo(
    () => new Map(initialProject?.participants.map((item) => [item.memberId, item.name]) ?? []),
    [initialProject]
  );
  const selectedIds = useMemo(
    () => new Set(participants.map((participant) => participant.memberId)),
    [participants]
  );
  const selectableMembers = members.filter((member) => !selectedIds.has(member.id));
  const representativeCount = images.filter((image) => image.representative).length;

  function participantName(memberId: number) {
    return memberById.get(memberId)?.name ?? initialNameById.get(memberId) ?? `멤버 #${memberId}`;
  }

  function addParticipant() {
    const memberId = Number(memberToAdd);
    if (!memberId || selectedIds.has(memberId)) return;
    setParticipants((current) => [
      ...current,
      { memberId, part: suggestedPart(memberById.get(memberId)) },
    ]);
    setMemberToAdd('');
  }

  function updateParticipantPart(memberId: number, part: ProjectPart) {
    setParticipants((current) =>
      current.map((participant) =>
        participant.memberId === memberId ? { ...participant, part } : participant
      )
    );
  }

  function removeParticipant(memberId: number) {
    if (memberId === currentMember.id) return;
    setParticipants((current) =>
      current.filter((participant) => participant.memberId !== memberId)
    );
  }

  async function handleImageSelection(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = '';
    if (files.length === 0) return;

    const invalid = files.find(
      (file) => !ALLOWED_IMAGE_TYPES.has(file.type) || file.size > MAX_IMAGE_SIZE
    );
    if (invalid) {
      setError(
        `${invalid.name}: PNG/JPEG/WebP/GIF 형식의 5MB 이하 이미지만 올릴 수 있어요.`
      );
      return;
    }

    setError('');
    setUploadingCount((count) => count + files.length);

    const results = await Promise.allSettled(files.map((file) => uploadProjectImage(file)));
    const uploadedUrls = results.flatMap((result) =>
      result.status === 'fulfilled' ? [result.value.url] : []
    );
    const failedCount = results.length - uploadedUrls.length;

    if (uploadedUrls.length > 0) {
      setImages((current) => {
        const hasRepresentative = current.some((image) => image.representative);
        return [
          ...current,
          ...uploadedUrls.map((url, index) => ({
            url,
            representative: !hasRepresentative && index === 0,
          })),
        ];
      });
    }
    if (failedCount > 0) {
      const firstFailure = results.find((result) => result.status === 'rejected');
      setError(
        firstFailure?.status === 'rejected'
          ? apiErrorMessage(firstFailure.reason)
          : `${failedCount}개 이미지를 올리지 못했어요.`
      );
    }
    setUploadingCount((count) => Math.max(0, count - files.length));
  }

  function removeImage(index: number) {
    setImages((current) => current.filter((_, imageIndex) => imageIndex !== index));
  }

  function setRepresentative(index: number) {
    setImages((current) =>
      current.map((image, imageIndex) => ({
        ...image,
        representative: imageIndex === index,
      }))
    );
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (submitting || uploadingCount > 0) return;
    setError('');

    const parsedCohort = Number(cohort);
    if (!Number.isInteger(parsedCohort) || parsedCohort < 1) {
      setError('기수를 올바르게 입력해 주세요.');
      return;
    }
    if (endDate && startDate && endDate < startDate) {
      setError('종료일은 시작일보다 빠를 수 없어요.');
      return;
    }
    if (images.length === 0 || representativeCount !== 1) {
      setError('이미지를 한 장 이상 올리고 대표 이미지를 정확히 한 장 선택해 주세요.');
      return;
    }
    if (!selectedIds.has(currentMember.id)) {
      setError('본인을 참여자에 포함해 주세요.');
      return;
    }

    const stacks = Array.from(
      new Set(
        techStack
          .split(',')
          .map((stack) => stack.trim())
          .filter(Boolean)
      )
    );

    setSubmitting(true);
    try {
      if (initialProject) {
        await replaceProject(initialProject.id, {
          title: title.trim(),
          summary: summary.trim(),
          techStack: stacks,
          githubUrl: githubUrl.trim() || null,
          startDate: startDate || null,
          endDate: endDate || null,
          images,
          participants,
        });
      } else {
        await createProject({
          title: title.trim(),
          summary: summary.trim(),
          cohort: parsedCohort,
          techStack: stacks,
          githubUrl: githubUrl.trim() || undefined,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
          images,
          participants,
        });
      }
      router.push('/member/projects');
      router.refresh();
    } catch (submitError) {
      if (submitError instanceof MemberApiError && submitError.status === 401) {
        router.replace(`/member/login?returnTo=${encodeURIComponent(pathname)}`);
        return;
      }
      setError(apiErrorMessage(submitError));
    } finally {
      setSubmitting(false);
    }
  }

  const inputClass =
    'w-full rounded-2xl border border-white/10 bg-white/[0.045] px-4 py-3.5 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-accent/70 focus:bg-white/[0.06]';
  const labelClass = 'mb-2.5 block text-sm font-medium text-white/70';

  return (
    <form onSubmit={handleSubmit} className="mt-12 grid gap-12 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="min-w-0 space-y-10">
        <section className="space-y-5">
          <div>
            <label htmlFor="project-title" className={labelClass}>
              프로젝트명
            </label>
            <input
              id="project-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className={inputClass}
              required
              maxLength={255}
              placeholder="서비스 이름"
            />
          </div>
          <div>
            <label htmlFor="project-summary" className={labelClass}>
              한 줄 소개
            </label>
            <textarea
              id="project-summary"
              value={summary}
              onChange={(event) => setSummary(event.target.value)}
              className={`${inputClass} min-h-28 resize-y leading-6`}
              required
              placeholder="누구의 어떤 문제를 해결하는 서비스인지 알려주세요."
            />
          </div>
          <div className="grid gap-5 sm:grid-cols-3">
            <div>
              <label htmlFor="project-cohort" className={labelClass}>
                기수
              </label>
              <input
                id="project-cohort"
                type="number"
                min={1}
                value={cohort}
                onChange={(event) => setCohort(event.target.value)}
                className={`${inputClass} disabled:cursor-not-allowed disabled:opacity-45`}
                required
                disabled={editing}
              />
              {editing ? <p className="mt-2 text-xs text-white/30">기수는 수정할 수 없어요.</p> : null}
            </div>
            <div>
              <label htmlFor="project-start-date" className={labelClass}>
                개발 시작일
              </label>
              <input
                id="project-start-date"
                type="date"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="project-end-date" className={labelClass}>
                개발 종료일
              </label>
              <input
                id="project-end-date"
                type="date"
                value={endDate}
                min={startDate || undefined}
                onChange={(event) => setEndDate(event.target.value)}
                className={inputClass}
              />
              <p className="mt-2 text-xs text-white/30">비워두면 진행 중으로 표시돼요.</p>
            </div>
          </div>
          <div>
            <label htmlFor="project-tech" className={labelClass}>
              기술 스택
            </label>
            <input
              id="project-tech"
              value={techStack}
              onChange={(event) => setTechStack(event.target.value)}
              className={inputClass}
              placeholder="React, Spring Boot, Figma"
            />
            <p className="mt-2 text-xs text-white/30">쉼표로 구분해 여러 개 입력할 수 있어요.</p>
          </div>
          <div>
            <label htmlFor="project-github" className={labelClass}>
              GitHub URL
            </label>
            <input
              id="project-github"
              type="url"
              value={githubUrl}
              onChange={(event) => setGithubUrl(event.target.value)}
              className={inputClass}
              placeholder="https://github.com/..."
            />
          </div>
        </section>

        <section className="border-t border-white/10 pt-10">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold">프로젝트 이미지</h2>
              <p className="mt-2 text-sm text-white/40">
                4:5 세로 이미지를 여러 장 올리고 대표 한 장을 선택해 주세요.
              </p>
            </div>
            <label className="inline-flex min-h-11 cursor-pointer items-center rounded-full border border-white/15 px-4 py-2.5 text-sm text-white/65 transition hover:border-white/30 hover:text-white focus-within:ring-2 focus-within:ring-accent">
              {uploadingCount > 0 ? `${uploadingCount}개 업로드 중…` : '이미지 추가'}
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                multiple
                disabled={uploadingCount > 0}
                onChange={(event) => void handleImageSelection(event)}
                className="sr-only"
              />
            </label>
          </div>

          {images.length === 0 ? (
            <div className="mt-6 flex aspect-[4/2] items-center justify-center rounded-3xl border border-dashed border-white/15 text-sm text-white/30">
              아직 올린 이미지가 없어요.
            </div>
          ) : (
            <ul className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
              {images.map((image, index) => (
                <li
                  key={`${image.url}-${index}`}
                  className={`relative overflow-hidden rounded-2xl border ${
                    image.representative ? 'border-accent' : 'border-white/10'
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={image.url} alt="" className="aspect-[4/5] w-full bg-black/30 object-cover" />
                  <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-black/75 p-2 backdrop-blur">
                    <button
                      type="button"
                      onClick={() => setRepresentative(index)}
                      className={`min-h-11 rounded-full px-2.5 py-1 text-[11px] font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white ${
                        image.representative
                          ? 'bg-accent text-white'
                          : 'bg-white/10 text-white/65 hover:bg-white/20'
                      }`}
                    >
                      {image.representative ? '대표' : '대표 지정'}
                    </button>
                    <button
                      type="button"
                      onClick={() => removeImage(index)}
                      aria-label={`${index + 1}번째 이미지 삭제`}
                      className="min-h-11 min-w-11 rounded-md px-2 py-1 text-xs text-red-200/70 hover:text-red-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-200"
                    >
                      삭제
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
          {images.length > 0 && representativeCount !== 1 ? (
            <p className="mt-3 text-sm text-amber-300">대표 이미지를 한 장 선택해야 저장할 수 있어요.</p>
          ) : null}
        </section>

        <section className="border-t border-white/10 pt-10">
          <h2 className="text-xl font-semibold">참여자와 프로젝트 파트</h2>
          <p className="mt-2 text-sm text-white/40">
            조직 역할을 기본값으로 제안했어요. 실제 프로젝트에서 맡은 파트로 바꿔주세요.
          </p>

          <div className="mt-6 flex gap-3">
            <select
              value={memberToAdd}
              onChange={(event) => setMemberToAdd(event.target.value)}
              className={`${inputClass} min-w-0 flex-1`}
              aria-label="추가할 멤버"
            >
              <option value="">멤버 선택</option>
              {selectableMembers.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={addParticipant}
              disabled={!memberToAdd}
              className="min-h-11 shrink-0 rounded-2xl border border-white/15 px-5 text-sm font-medium transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-35"
            >
              추가
            </button>
          </div>

          <ul className="mt-4 space-y-3">
            {participants.map((participant) => (
              <li
                key={participant.memberId}
                className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.025] p-4 sm:flex-row sm:items-center"
              >
                <div className="min-w-0 flex-1">
                  <span className="font-medium">{participantName(participant.memberId)}</span>
                  {participant.memberId === currentMember.id ? (
                    <span className="ml-2 rounded-full bg-accent/10 px-2 py-1 text-[10px] font-semibold text-accent">
                      본인 · 필수
                    </span>
                  ) : null}
                </div>
                <select
                  value={participant.part}
                  onChange={(event) =>
                    updateParticipantPart(participant.memberId, event.target.value as ProjectPart)
                  }
                  className="min-h-11 rounded-xl border border-white/10 bg-[#222] px-3 py-2 text-sm outline-none focus:border-accent/70"
                  aria-label={`${participantName(participant.memberId)} 프로젝트 파트`}
                >
                  {PARTS.map((part) => (
                    <option key={part} value={part}>
                      {part}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => removeParticipant(participant.memberId)}
                  disabled={participant.memberId === currentMember.id}
                  className="min-h-11 rounded-md px-2 text-left text-xs text-red-200/65 hover:text-red-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-200 disabled:cursor-not-allowed disabled:text-white/20 sm:text-center"
                >
                  제외
                </button>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <aside className="lg:sticky lg:top-8 lg:h-fit">
        <div className="rounded-3xl border border-white/10 bg-white/[0.035] p-6">
          <p className="text-sm font-semibold text-white">저장 전 확인해 주세요</p>
          <ul className="mt-4 space-y-3 text-sm leading-6 text-white/45">
            <li>등록을 완료하면 사전 승인 없이 공개 목록에 즉시 나타납니다.</li>
            <li>모든 공동 참여자가 이 프로젝트를 수정하거나 삭제할 수 있습니다.</li>
            <li>삭제한 프로젝트는 되돌릴 수 없습니다.</li>
          </ul>
          {error ? (
            <p role="alert" className="mt-5 rounded-2xl bg-red-400/[0.08] p-4 text-sm leading-6 text-red-200">
              {error}
            </p>
          ) : null}
          <button
            type="submit"
            disabled={submitting || uploadingCount > 0 || representativeCount !== 1}
            className="mt-6 w-full rounded-full bg-accent px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-[#ff6a26] disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-white/30"
          >
            {uploadingCount > 0
              ? '이미지 업로드 중…'
              : submitting
                ? '저장 중…'
                : editing
                  ? '수정 내용 저장'
                  : '등록하고 바로 공개'}
          </button>
        </div>
      </aside>
    </form>
  );
}
