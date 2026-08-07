'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Member } from '@shared/types/member';
import { ROLE_LABELS } from '@/lib/roster';
import { MemberApiError, updateMyProfile, uploadMemberImage } from '@/lib/memberApi';
import { cardSurface, chip, dangerGhostButton, primaryButton, secondaryButton } from '@/components/member/ui/styles';

const ALLOWED_IMAGE_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif']);
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

type Props = {
  profile: Member;
};

function apiErrorMessage(error: unknown) {
  if (error instanceof MemberApiError) {
    if (error.code === 'MUST_CHANGE_PASSWORD') return '비밀번호를 먼저 변경해야 프로필을 저장할 수 있어요.';
    return error.message;
  }
  return '프로필을 저장하지 못했어요.';
}

export default function MemberProfileForm({ profile }: Props) {
  const router = useRouter();
  // 마지막으로 저장 성공한 값 — 폼 상태와 비교해 dirty를 판단한다. props.profile은 마운트 시점 값이라
  // 저장 후에도 안 바뀌므로 이걸 따로 들고 있지 않으면 저장 직후에도 dirty가 안 풀린다.
  const [savedProfile, setSavedProfile] = useState(profile);
  const [photoUrl, setPhotoUrl] = useState<string | null>(profile.photoUrl);
  const [joinReason, setJoinReason] = useState(profile.joinReason ?? '');
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  const dirty =
    photoUrl !== savedProfile.photoUrl || joinReason !== (savedProfile.joinReason ?? '');

  async function handlePhotoSelect(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    if (!ALLOWED_IMAGE_TYPES.has(file.type) || file.size > MAX_IMAGE_SIZE) {
      setError('PNG/JPEG/WebP/GIF 형식의 5MB 이하 이미지만 올릴 수 있어요.');
      return;
    }

    setError('');
    setSaved(false);
    setUploading(true);
    try {
      const { url } = await uploadMemberImage(file);
      setPhotoUrl(url);
    } catch (uploadError) {
      setError(apiErrorMessage(uploadError));
    } finally {
      setUploading(false);
    }
  }

  function handleCancel() {
    // 취소 = 편집을 접고 이전 화면(멤버 대시보드)으로 돌아간다. 폼 값만 되돌리는 게 아니다.
    router.back();
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (submitting || uploading) return;
    setError('');
    setSaved(false);
    setSubmitting(true);
    try {
      const trimmedReason = joinReason.trim() ? joinReason.trim() : null;
      const updated = await updateMyProfile({ photoUrl, joinReason: trimmedReason });
      setSavedProfile(updated);
      setPhotoUrl(updated.photoUrl);
      setJoinReason(updated.joinReason ?? '');
      setSaved(true);
    } catch (submitError) {
      if (submitError instanceof MemberApiError && submitError.status === 401) {
        router.replace('/member/login?returnTo=%2Fmember%2Fprofile');
        return;
      }
      setError(apiErrorMessage(submitError));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-10 flex flex-col gap-6">
      <section className={`${cardSurface} p-6 sm:p-7`}>
        <SectionTitle title="프로필 사진" description="멤버 카드 앞면에 쓰여요." />
        <div className="mt-5 flex flex-col items-start gap-5 sm:flex-row sm:items-center">
          <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/[0.05] ring-1 ring-white/10">
            {photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={photoUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="text-4xl" aria-hidden>
                {profile.emoji || '🦁'}
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className={`${secondaryButton} cursor-pointer focus-within:ring-2 focus-within:ring-accent`}>
              {uploading ? '업로드 중…' : '사진 변경'}
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                disabled={uploading}
                onChange={(event) => void handlePhotoSelect(event)}
                className="sr-only"
              />
            </label>
            {photoUrl ? (
              <button
                type="button"
                onClick={() => {
                  setPhotoUrl(null);
                  setSaved(false);
                }}
                className={dangerGhostButton}
              >
                사진 삭제
              </button>
            ) : null}
          </div>
        </div>
      </section>

      <section className={`${cardSurface} p-6 sm:p-7`}>
        <SectionTitle
          title="기본 정보"
          description="이름·기수·역할은 관리자가 등록한 값이라 여기서 바꿀 수 없어요."
        />
        <dl className="mt-5 grid gap-5 sm:grid-cols-3">
          <ReadonlyField label="이름" value={profile.name} />
          <ReadonlyField label="기수" value={`${profile.cohort}기`} />
          <div>
            <dt className="text-xs font-medium uppercase tracking-wider text-white/40">역할</dt>
            <dd className="mt-2 flex flex-wrap gap-1.5">
              {profile.roles.length > 0 ? (
                profile.roles.map((role) => (
                  <span key={role} className={chip}>
                    {ROLE_LABELS[role]}
                  </span>
                ))
              ) : (
                <span className="text-sm text-white/40">-</span>
              )}
            </dd>
          </div>
        </dl>
      </section>

      <section className={`${cardSurface} p-6 sm:p-7`}>
        <SectionTitle title="입부계기" description="멤버 카드 뒷면에 표시돼요." />
        <textarea
          id="join-reason"
          value={joinReason}
          onChange={(event) => {
            setJoinReason(event.target.value);
            setSaved(false);
          }}
          className="mt-5 min-h-36 w-full resize-y rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3.5 text-sm leading-6 text-white outline-none transition-colors placeholder:text-white/25 focus:border-accent/70 focus:bg-white/[0.05]"
          placeholder="멋사에 들어온 계기를 남겨보세요."
          maxLength={2000}
        />
        <p className="mt-2 text-right text-xs tabular-nums text-white/30">{joinReason.length} / 2000</p>
      </section>

      {error ? (
        <p role="alert" className="rounded-2xl bg-red-400/[0.08] p-4 text-sm leading-6 text-red-200">
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={submitting || uploading || !dirty} className={primaryButton}>
          {submitting ? '저장 중…' : '저장'}
        </button>
        <button type="button" onClick={handleCancel} disabled={submitting} className={secondaryButton}>
          취소
        </button>
        {saved && !dirty ? (
          <span role="status" className="text-sm text-emerald-300">
            저장했어요. 공개 멤버 카드에도 반영돼요.
          </span>
        ) : null}
      </div>
    </form>
  );
}

function SectionTitle({ title, description }: { title: string; description?: string }) {
  return (
    <div>
      <h2 className="text-base font-semibold tracking-[-0.02em] text-white">{title}</h2>
      {description ? <p className="mt-1 text-xs leading-5 text-white/40">{description}</p> : null}
    </div>
  );
}

function ReadonlyField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wider text-white/40">{label}</dt>
      <dd className="mt-2 text-sm text-white/85">{value}</dd>
    </div>
  );
}
