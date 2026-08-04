'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Member } from '@shared/types/member';
import { ROLE_LABELS } from '@/lib/roster';
import { MemberApiError, updateMyProfile, uploadMemberImage } from '@/lib/memberApi';

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
    setPhotoUrl(savedProfile.photoUrl);
    setJoinReason(savedProfile.joinReason ?? '');
    setError('');
    setSaved(false);
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

  const labelClass = 'mb-2.5 block text-sm font-medium text-white/70';

  return (
    <form onSubmit={handleSubmit} className="mt-12 space-y-10">
      <section className="flex flex-col items-start gap-5 sm:flex-row sm:items-center">
        <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/[0.05]">
          {photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photoUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="text-4xl" aria-hidden>
              {profile.emoji}
            </span>
          )}
        </div>
        <div className="flex flex-wrap gap-3">
          <label className="inline-flex min-h-11 cursor-pointer items-center rounded-full border border-white/15 px-4 py-2.5 text-sm text-white/65 transition hover:border-white/30 hover:text-white focus-within:ring-2 focus-within:ring-accent">
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
              className="inline-flex min-h-11 items-center rounded-full px-4 text-sm text-red-300/75 transition hover:text-red-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-200"
            >
              사진 삭제
            </button>
          ) : null}
        </div>
      </section>

      <section className="grid gap-5 border-t border-white/10 pt-10 sm:grid-cols-3">
        <div>
          <p className={labelClass}>이름</p>
          <p className="text-sm text-white/85">{profile.name}</p>
        </div>
        <div>
          <p className={labelClass}>기수</p>
          <p className="text-sm text-white/85">{profile.cohort}기</p>
        </div>
        <div>
          <p className={labelClass}>역할</p>
          <p className="text-sm text-white/85">
            {profile.roles.map((role) => ROLE_LABELS[role]).join(', ') || '-'}
          </p>
        </div>
        <p className="col-span-full text-xs text-white/30">
          이름·기수·역할은 관리자가 등록한 값이라 여기서 바꿀 수 없어요.
        </p>
      </section>

      <section className="border-t border-white/10 pt-10">
        <label htmlFor="join-reason" className={labelClass}>
          입부계기
        </label>
        <textarea
          id="join-reason"
          value={joinReason}
          onChange={(event) => {
            setJoinReason(event.target.value);
            setSaved(false);
          }}
          className="w-full min-h-32 resize-y rounded-2xl border border-white/10 bg-white/[0.045] px-4 py-3.5 text-sm leading-6 text-white outline-none transition placeholder:text-white/25 focus:border-accent/70 focus:bg-white/[0.06]"
          placeholder="멋사에 들어온 계기를 남겨보세요. 멤버 카드 뒷면에 표시돼요."
          maxLength={2000}
        />
      </section>

      {error ? (
        <p role="alert" className="rounded-2xl bg-red-400/[0.08] p-4 text-sm leading-6 text-red-200">
          {error}
        </p>
      ) : null}
      {saved && !dirty ? (
        <p role="status" className="text-sm text-emerald-300">
          저장했어요. 공개 멤버 카드에도 반영돼요.
        </p>
      ) : null}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={submitting || uploading || !dirty}
          className="min-h-11 rounded-full bg-accent px-6 text-sm font-semibold text-white transition hover:bg-[#ff6a26] disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-white/30"
        >
          {submitting ? '저장 중…' : '저장'}
        </button>
        <button
          type="button"
          onClick={handleCancel}
          disabled={submitting || !dirty}
          className="min-h-11 rounded-full border border-white/15 px-6 text-sm text-white/65 transition hover:border-white/30 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
        >
          취소
        </button>
      </div>
    </form>
  );
}
