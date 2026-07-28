'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { refreshSession, getRecruitmentStatus, updateRecruitmentStatus, AdminApiError } from '@/lib/adminApi';
import type { RecruitmentStatusResponse } from '@shared/types/recruitment';

export default function RecruitmentManagement() {
  const router = useRouter();

  const [status, setStatus] = useState<RecruitmentStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [reloadIndex, setReloadIndex] = useState(0);

  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState('');

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      setLoadError('');
      try {
        await refreshSession();
        if (cancelled) return;
        const current = await getRecruitmentStatus();
        if (cancelled) return;
        setStatus(current);
      } catch (err) {
        if (cancelled) return;
        if (
          err instanceof AdminApiError &&
          (err.status === 401 || err.code === 'UNAUTHENTICATED' || err.code === 'INVALID_REFRESH_TOKEN')
        ) {
          router.replace('/admin/login');
          return;
        }
        setLoadError(err instanceof AdminApiError ? err.message : '불러오지 못했어요.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [reloadIndex, router]);

  async function handleToggle() {
    if (!status || submitting) return;

    const turningOn = !status.open;
    const confirmMessage = turningOn
      ? `구독자 ${status.subscriberCount}명에게 안내 메일이 발송됩니다. 모집을 여시겠어요?`
      : '모집을 종료할까요? 공개 사이트가 평소(모집 알림) 화면으로 돌아가요.';
    if (!window.confirm(confirmMessage)) return;

    setSubmitting(true);
    setActionError('');
    try {
      const updated = await updateRecruitmentStatus({ open: turningOn });
      setStatus(updated);
    } catch (err) {
      setActionError(err instanceof AdminApiError ? err.message : '모집 상태 변경에 실패했어요.');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <p className="py-24 text-center text-sm text-muted">불러오고 있어요…</p>;
  }

  if (loadError || !status) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-24 text-center">
        <p className="text-sm text-muted">{loadError || '불러오지 못했어요.'}</p>
        <button
          type="button"
          onClick={() => setReloadIndex((v) => v + 1)}
          className="rounded-full border border-white/20 bg-white/10 px-5 py-2 text-sm text-white transition-colors hover:bg-white/20"
        >
          다시 시도
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-white">모집 관리</h1>
        <button
          type="button"
          onClick={() => router.push('/admin')}
          className="rounded-full border border-white/20 px-4 py-1.5 text-sm text-white transition-colors hover:bg-white/10"
        >
          ← 대시보드
        </button>
      </div>

      <div className="rounded-xl border border-white/10 bg-white/5 p-6">
        <p className="text-sm text-muted">현재 상태</p>
        <p className="mt-1 text-xl font-semibold text-white">
          {status.open ? '모집중' : '평소'}
        </p>
        <p className="mt-2 text-sm text-muted">
          켤 경우 안내 메일을 받을 구독자 · <span className="text-white">{status.subscriberCount}명</span>
        </p>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={submitting}
            onClick={handleToggle}
            className="rounded-full border border-white/20 bg-white/10 px-5 py-2.5 text-sm text-white transition-colors hover:bg-white/20 disabled:opacity-40"
          >
            {submitting ? '처리 중…' : status.open ? '모집 종료' : '모집 시작'}
          </button>
          <a
            href="/recruit?preview=1"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full border border-white/20 px-5 py-2.5 text-sm text-white transition-colors hover:bg-white/10"
          >
            켰을 때 미리보기
          </a>
        </div>

        {actionError && <p className="mt-4 text-sm text-red-400">{actionError}</p>}
      </div>

      <p className="mt-6 text-xs text-muted">
        지원폼이 아직 준비되지 않아, 모집중일 때 방문자에게는 임시 안내 문구가 보여요(지원폼 완성 후 교체 예정 — #152).
      </p>
    </div>
  );
}
