'use client';

import { useEffect, useState } from 'react';
import AdminLoading from './AdminLoading';
import { useRouter } from 'next/navigation';
import { refreshSession, listApplications, AdminApiError } from '@/lib/adminApi';
import { formatDate } from '@/lib/formatDate';
import type { ApplicationAdminSummary } from '@shared/types/application';

// 지원자 개인정보 열람은 서버에 감사 기록으로 남는다(#338). 열기 전에 한 번 각인시켜 무심결·사적
// 호기심에 의한 열람을 줄인다. 경고 자체는 UX 억지 장치일 뿐, 실제 기록은 서버 경계에서 무조건 남는다.
// 같은 세션에선 한 번만 물어 경고 피로를 막는다.
const ACK_KEY = 'audit-ack-applications';

export default function ApplicationList() {
  const router = useRouter();

  const [acknowledged, setAcknowledged] = useState(false);
  const [applications, setApplications] = useState<ApplicationAdminSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState('');

  // 세션에 이미 열람 동의가 있으면 경고를 건너뛴다. sessionStorage는 클라이언트에만 있어 effect에서 확인한다.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (typeof window !== 'undefined' && sessionStorage.getItem(ACK_KEY) === 'true') {
        if (!cancelled) setAcknowledged(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!acknowledged) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setLoadError('');
      try {
        await refreshSession();
        if (cancelled) return;
        const list = await listApplications();
        if (cancelled) return;
        setApplications(list);
      } catch (err) {
        if (cancelled) return;
        if (err instanceof AdminApiError && err.status === 401) {
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
  }, [acknowledged, router]);

  function proceed() {
    if (typeof window !== 'undefined') sessionStorage.setItem(ACK_KEY, 'true');
    setAcknowledged(true);
  }

  if (!acknowledged) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-5 rounded-2xl border border-white/10 bg-white/5 p-8 text-center">
        <h1 className="text-lg font-bold text-white">지원자 개인정보 열람</h1>
        <p className="text-sm leading-relaxed text-muted">
          지원자의 실명·연락처 등 개인정보를 엽니다.{' '}
          <span className="text-white">이 열람은 누가·언제 봤는지 감사 기록으로 남아요.</span> 업무상 필요한 경우에만
          계속해 주세요.
        </p>
        <div className="flex w-full gap-3">
          <button
            type="button"
            onClick={() => router.push('/admin')}
            className="min-h-11 flex-1 rounded-xl border border-white/20 px-4 text-sm text-white transition-colors hover:bg-white/10"
          >
            취소
          </button>
          <button
            type="button"
            onClick={proceed}
            className="min-h-11 flex-1 rounded-xl bg-white px-4 text-sm font-medium text-black transition-colors hover:bg-white/90"
          >
            열람 계속
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return <AdminLoading className="mx-auto max-w-3xl" rows={6} />;
  }

  if (loadError) {
    return <p className="py-24 text-center text-sm text-muted">{loadError}</p>;
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-white">지원자 ({applications.length})</h1>
        <button
          type="button"
          onClick={() => router.push('/admin')}
          className="rounded-full border border-white/20 px-4 py-1.5 text-sm text-white transition-colors hover:bg-white/10"
        >
          ← 대시보드
        </button>
      </div>

      {applications.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted">아직 지원자가 없어요.</p>
      ) : (
        <ul className="flex flex-col gap-4">
          {applications.map((app) => (
            <li key={app.id} className="rounded-xl border border-white/10 bg-white/5 p-5">
              <p className="mb-3 text-xs text-muted">{formatDate(app.submittedAt)} 접수</p>
              <dl className="flex flex-col gap-2">
                {app.schema.questions.map((q) => {
                  const answer = app.answers[q.id];
                  // 세션별 조건부라 그 지원자에겐 안 보였던 질문은 답이 없다 — 건너뛴다.
                  if (answer === undefined || answer === '') return null;
                  return (
                    <div key={q.id} className="flex flex-col gap-0.5 sm:flex-row sm:gap-3">
                      <dt className="shrink-0 text-sm text-muted sm:w-40">{q.label}</dt>
                      <dd className="text-sm whitespace-pre-wrap text-white">{answer}</dd>
                    </div>
                  );
                })}
              </dl>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
