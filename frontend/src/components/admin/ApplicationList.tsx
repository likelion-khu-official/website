'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { refreshSession, listApplications, AdminApiError } from '@/lib/adminApi';
import { formatDate } from '@/lib/formatDate';
import type { ApplicationAdminSummary } from '@shared/types/application';

export default function ApplicationList() {
  const router = useRouter();

  const [applications, setApplications] = useState<ApplicationAdminSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
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
  }, [router]);

  if (loading) {
    return <p className="py-24 text-center text-sm text-muted">불러오고 있어요…</p>;
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
