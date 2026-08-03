'use client';

import { useEffect, useMemo, useState } from 'react';
import NotificationForm from '@/components/NotificationForm';
import {
  getApplicationForm,
  getRecruitmentStatus,
  submitApplication,
} from '@/lib/applicationApi';
import type {
  ApplicationFormSchema,
  ApplicationQuestion,
  ApplicationTrack,
} from '@shared/types/application';
import { trackKeyClick } from '@/lib/publicAnalytics';

const TRACK_OPTIONS: ApplicationTrack[] = ['FE', 'BE', 'DESIGN', 'AI'];
const TRACK_LABEL: Record<ApplicationTrack, string> = {
  FE: '프론트엔드',
  BE: '백엔드',
  DESIGN: '디자인',
  AI: 'AI',
};

type Phase = 'loading' | 'closed' | 'open' | 'done' | 'error';

const inputClass =
  'w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-muted outline-none focus:border-white/30 disabled:opacity-40';

export default function ApplyForm({ preview = false }: { preview?: boolean }) {
  const [phase, setPhase] = useState<Phase>('loading');
  const [schema, setSchema] = useState<ApplicationFormSchema | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (!preview) {
          const status = await getRecruitmentStatus();
          if (cancelled) return;
          if (!status.open) {
            setPhase('closed');
            return;
          }
        }
        const form = await getApplicationForm();
        if (cancelled) return;
        setSchema(form.schema);
        setPhase('open');
      } catch {
        if (!cancelled) setPhase('error');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [preview]);

  // 세션별 조건부 질문은 "첫 번째 track 질문"(=1지망)의 답에 따라 노출된다(#152 계약).
  const primaryTrackId = useMemo(
    () => schema?.questions.find((q) => q.type === 'track')?.id,
    [schema]
  );

  function isVisible(q: ApplicationQuestion): boolean {
    if (!q.showForTrack) return true; // 공통 질문
    if (!primaryTrackId) return false;
    return answers[primaryTrackId] === q.showForTrack;
  }

  function setAnswer(id: string, value: string) {
    setAnswers((prev) => ({ ...prev, [id]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!agreed || submitting || !schema) return;
    trackKeyClick('APPLY_APPLICATION_FORM');

    // 화면에 보이는 질문의 답만 보낸다 — 세션을 바꾸며 남은 이전 세션의 답이 섞이지 않게.
    const visible = schema.questions.filter(isVisible);
    const visibleAnswers: Record<string, string> = {};
    for (const q of visible) {
      visibleAnswers[q.id] = answers[q.id] ?? '';
    }

    setSubmitting(true);
    setError('');
    try {
      await submitApplication({ answers: visibleAnswers, privacyConsent: agreed });
      setPhase('done');
    } catch (err) {
      setError(err instanceof Error ? err.message : '지원서 제출에 실패했어요.');
    } finally {
      setSubmitting(false);
    }
  }

  if (phase === 'loading') {
    return <p className="py-24 text-center text-sm text-muted">불러오고 있어요…</p>;
  }

  if (phase === 'error') {
    return (
      <p className="py-24 text-center text-sm text-muted">
        지원서를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.
      </p>
    );
  }

  // 모집 기간이 아니면 같은 자리에 모집 알림 신청을 띄운다(#152 · 모집.md).
  if (phase === 'closed') {
    return (
      <div className="mx-auto flex max-w-sm flex-col items-center gap-5 py-16 text-center">
        <p className="text-lg font-semibold text-white">지금은 모집 기간이 아니에요</p>
        <p className="text-sm text-muted">
          이메일을 남겨두면 다음 모집이 열릴 때 가장 먼저 알려드릴게요.
        </p>
        <NotificationForm analyticsLocation="APPLICATION_CLOSED" />
      </div>
    );
  }

  if (phase === 'done') {
    return (
      <div className="mx-auto flex max-w-sm flex-col items-center gap-4 py-24 text-center">
        <p className="text-2xl font-bold text-white">지원이 접수됐어요! 🦁</p>
        <p className="text-sm text-muted">
          합격 여부는 사이트가 아니라 남겨주신 연락처로 따로 안내드려요.
        </p>
      </div>
    );
  }

  // phase === 'open'
  const visibleQuestions = schema!.questions.filter(isVisible);

  return (
    <form onSubmit={handleSubmit} className="mx-auto flex w-full max-w-lg flex-col gap-5 py-4">
      {(schema!.title || schema!.description) && (
        <div className="flex flex-col gap-1 text-center">
          {schema!.title && <h1 className="text-2xl font-bold text-white">{schema!.title}</h1>}
          {schema!.description && <p className="text-sm text-muted">{schema!.description}</p>}
        </div>
      )}

      {visibleQuestions.map((q) => (
        <label key={q.id} className="flex flex-col gap-1.5">
          <span className="text-sm text-white">
            {q.label}
            {q.required && <span className="ml-1 text-accent">*</span>}
          </span>
          <QuestionField
            question={q}
            value={answers[q.id] ?? ''}
            disabled={submitting}
            onChange={(v) => setAnswer(q.id, v)}
          />
        </label>
      ))}

      {/* 개인정보 수집·이용 동의 — 개인정보보호법 제15조 4대 고지(#152, 보관기간은 #217 확정 전 임시) */}
      <div className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-left">
        <ul className="mb-2 flex flex-col gap-0.5 text-xs text-muted">
          <li>· 수집 목적 — 신규 부원 선발 및 결과 안내</li>
          <li>· 수집 항목 — 지원서에 입력한 이름·연락처·학과·지원 내용</li>
          <li>· 보유 기간 — 모집(선발) 종료 후 6개월 뒤 파기</li>
          <li>· 동의를 거부할 수 있으며, 거부 시 지원할 수 없어요</li>
        </ul>
        <label className="flex cursor-pointer items-center gap-2 text-sm text-white">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            disabled={submitting}
            className="h-4 w-4 accent-white"
          />
          개인정보 수집·이용에 동의해요 (필수)
        </label>
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <button
        type="submit"
        disabled={!agreed || submitting}
        className="rounded-full border border-white/20 bg-white/10 px-5 py-3 text-sm text-white transition-colors hover:bg-white/20 disabled:opacity-40"
      >
        {submitting ? '제출 중…' : '지원서 제출하기'}
      </button>
    </form>
  );
}

function QuestionField({
  question,
  value,
  disabled,
  onChange,
}: {
  question: ApplicationQuestion;
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  const common = {
    value,
    disabled,
    required: question.required,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      onChange(e.target.value),
  };

  switch (question.type) {
    case 'long_text':
      return <textarea {...common} rows={4} className={inputClass} />;
    case 'select':
      return (
        <select {...common} className={inputClass}>
          <option value="">선택해 주세요</option>
          {(question.options ?? []).map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      );
    case 'track':
      return (
        <select {...common} className={inputClass}>
          <option value="">선택해 주세요</option>
          {TRACK_OPTIONS.map((t) => (
            <option key={t} value={t}>
              {TRACK_LABEL[t]}
            </option>
          ))}
        </select>
      );
    case 'email':
      return <input {...common} type="email" className={inputClass} />;
    case 'phone':
      return <input {...common} type="tel" className={inputClass} />;
    case 'url':
      return <input {...common} type="url" placeholder="https://" className={inputClass} />;
    default:
      return <input {...common} type="text" className={inputClass} />;
  }
}
