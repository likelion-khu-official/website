'use client';

import { useEffect, useState } from 'react';
import AdminLoading from './AdminLoading';
import { useRouter } from 'next/navigation';
import {
  refreshSession,
  getApplicationForm,
  updateApplicationForm,
  AdminApiError,
} from '@/lib/adminApi';
import type {
  ApplicationDataClass,
  ApplicationQuestion,
  ApplicationQuestionType,
  ApplicationTrack,
} from '@shared/types/application';

const TYPE_OPTIONS: { value: ApplicationQuestionType; label: string }[] = [
  { value: 'short_text', label: '한 줄 텍스트' },
  { value: 'long_text', label: '여러 줄 텍스트' },
  { value: 'email', label: '이메일' },
  { value: 'phone', label: '전화번호' },
  { value: 'url', label: '링크(URL)' },
  { value: 'select', label: '단일 선택' },
  { value: 'track', label: '지원 세션(FE/BE/디자인/AI)' },
];

const TRACK_OPTIONS: ApplicationTrack[] = ['FE', 'BE', 'DESIGN', 'AI'];

// 데이터 처리 분류(PM 결정) — 파기·노출 정책의 근거. 자세한 정의는 shared/types/application.ts.
const DATA_CLASS_OPTIONS: { value: ApplicationDataClass; label: string }[] = [
  { value: 'A', label: 'A · 모집 후 파기' },
  { value: 'B', label: 'B · 홈페이지 노출' },
  { value: 'C', label: 'C · 비노출 보관' },
];

function newQuestion(): ApplicationQuestion {
  return {
    id: 'q_' + Math.random().toString(36).slice(2, 8),
    label: '',
    type: 'short_text',
    required: true,
    dataClass: 'A',
  };
}

const controlClass =
  'rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-white/30';

export default function ApplicationFormEditor() {
  const router = useRouter();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [questions, setQuestions] = useState<ApplicationQuestion[]>([]);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [saveError, setSaveError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setLoadError('');
      try {
        await refreshSession();
        if (cancelled) return;
        const { schema } = await getApplicationForm();
        if (cancelled) return;
        setTitle(schema.title ?? '');
        setDescription(schema.description ?? '');
        setQuestions(schema.questions ?? []);
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

  function patchQuestion(index: number, patch: Partial<ApplicationQuestion>) {
    setQuestions((prev) => prev.map((q, i) => (i === index ? { ...q, ...patch } : q)));
  }

  function move(index: number, delta: number) {
    setQuestions((prev) => {
      const next = [...prev];
      const target = index + delta;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function remove(index: number) {
    setQuestions((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSave() {
    setSaving(true);
    setSaveMessage('');
    setSaveError('');
    try {
      const schema = {
        title: title.trim() || undefined,
        description: description.trim() || undefined,
        questions,
      };
      await updateApplicationForm(schema);
      setSaveMessage('저장했어요. 지원자에게 이 양식으로 보여요.');
    } catch (err) {
      setSaveError(err instanceof AdminApiError ? err.message : '저장에 실패했어요.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <AdminLoading className="mx-auto max-w-3xl" variant="form" rows={5} />;
  }

  if (loadError) {
    return <p className="py-24 text-center text-sm text-muted">{loadError}</p>;
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-white">지원서 양식 편집</h1>
        <button
          type="button"
          onClick={() => router.push('/admin')}
          className="rounded-full border border-white/20 px-4 py-1.5 text-sm text-white transition-colors hover:bg-white/10"
        >
          ← 대시보드
        </button>
      </div>

      <div className="mb-6 flex flex-col gap-3">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="지원서 제목 (예: 14기 신규 부원 모집)"
          className={controlClass}
        />
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="안내 문구 (선택)"
          rows={2}
          className={controlClass}
        />
      </div>

      {questions.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted">
          아직 질문이 없어요. 아래 “+ 질문 추가”로 만들어 주세요.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {questions.map((q, index) => (
            <li
              key={q.id}
              className="flex flex-col gap-3 rounded-xl border border-white/10 bg-white/5 p-4"
            >
              <div className="flex items-start gap-2">
                <input
                  value={q.label}
                  onChange={(e) => patchQuestion(index, { label: e.target.value })}
                  placeholder="질문 (예: 이름)"
                  className={`flex-1 ${controlClass}`}
                />
                <div className="flex flex-col gap-1">
                  <button
                    type="button"
                    onClick={() => move(index, -1)}
                    disabled={index === 0}
                    className="rounded border border-white/10 px-2 text-xs text-muted hover:text-white disabled:opacity-30"
                    aria-label="위로"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    onClick={() => move(index, 1)}
                    disabled={index === questions.length - 1}
                    className="rounded border border-white/10 px-2 text-xs text-muted hover:text-white disabled:opacity-30"
                    aria-label="아래로"
                  >
                    ↓
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <select
                  value={q.type}
                  onChange={(e) => {
                    const type = e.target.value as ApplicationQuestionType;
                    // 타입이 바뀌면 그 타입에 안 쓰는 필드는 정리한다 — track은 분기 기준이라
                    // 노출조건(showForTrack)이 없고, options는 select에서만 의미가 있다.
                    patchQuestion(index, {
                      type,
                      showForTrack: type === 'track' ? undefined : q.showForTrack,
                      options: type === 'select' ? q.options : undefined,
                    });
                  }}
                  className={controlClass}
                >
                  {TYPE_OPTIONS.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>

                <label className="flex items-center gap-1.5 text-sm text-white">
                  <input
                    type="checkbox"
                    checked={q.required}
                    onChange={(e) => patchQuestion(index, { required: e.target.checked })}
                    className="h-4 w-4 accent-white"
                  />
                  필수
                </label>

                {/* 데이터 분류(A/B/C) — 파기·노출 정책 근거. 기본 A(모집 후 파기) */}
                <label className="flex items-center gap-1.5 text-sm text-muted">
                  분류
                  <select
                    value={q.dataClass ?? 'A'}
                    onChange={(e) =>
                      patchQuestion(index, {
                        dataClass: e.target.value as ApplicationDataClass,
                      })
                    }
                    className={controlClass}
                  >
                    {DATA_CLASS_OPTIONS.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </label>

                {/* 세션별 조건부 노출 — track 질문 자체는 분기 기준이라 대상에서 제외 */}
                {q.type !== 'track' && (
                  <label className="flex items-center gap-1.5 text-sm text-muted">
                    노출 조건
                    <select
                      value={q.showForTrack ?? ''}
                      onChange={(e) =>
                        patchQuestion(index, {
                          showForTrack: (e.target.value || undefined) as
                            | ApplicationTrack
                            | undefined,
                        })
                      }
                      className={controlClass}
                    >
                      <option value="">항상 (공통)</option>
                      {TRACK_OPTIONS.map((t) => (
                        <option key={t} value={t}>
                          {t} 1지망일 때만
                        </option>
                      ))}
                    </select>
                  </label>
                )}

                <button
                  type="button"
                  onClick={() => remove(index)}
                  className="ml-auto rounded-full border border-white/20 px-3 py-1 text-xs text-muted transition-colors hover:text-red-400"
                >
                  삭제
                </button>
              </div>

              {q.type === 'select' && (
                <input
                  value={(q.options ?? []).join(', ')}
                  onChange={(e) =>
                    patchQuestion(index, {
                      options: e.target.value
                        .split(',')
                        .map((o) => o.trim())
                        .filter(Boolean),
                    })
                  }
                  placeholder="선택지 (쉼표로 구분 — 예: 1학년, 2학년, 3학년)"
                  className={controlClass}
                />
              )}
            </li>
          ))}
        </ul>
      )}

      <button
        type="button"
        onClick={() => setQuestions((prev) => [...prev, newQuestion()])}
        className="mt-4 rounded-full border border-white/20 bg-white/5 px-4 py-2 text-sm text-white transition-colors hover:bg-white/10"
      >
        + 질문 추가
      </button>

      <div className="mt-8 flex items-center gap-3 border-t border-white/10 pt-6">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="rounded-full border border-white/20 bg-white/10 px-6 py-2.5 text-sm text-white transition-colors hover:bg-white/20 disabled:opacity-40"
        >
          {saving ? '저장 중…' : '양식 저장'}
        </button>
        {saveMessage && <span className="text-sm text-accent">{saveMessage}</span>}
        {saveError && <span className="text-sm text-red-400">{saveError}</span>}
      </div>
    </div>
  );
}
