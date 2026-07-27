'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentMember, MemberApiError } from '@/lib/memberApi';
import { createPost, FeedApiError } from '@/lib/feedApi';
import type { PostCreateRequest } from '@shared/types/feed';
import ImageUploader from './ImageUploader';

type SessionState = 'checking' | 'ready' | 'error';

type SessionError = {
  title: string;
  description: string;
};

type Draft = {
  title: string;
  content: string;
  thumbnailUrl: string | null;
};

const DRAFT_KEY = 'feed-write-draft';
const WRITE_PATH = '/member/write';

const GENERIC_SESSION_ERROR: SessionError = {
  title: '확인하지 못했어요',
  description: '로그인 상태를 확인하는 중 문제가 생겼어요. 잠시 후 다시 시도해 주세요.',
};

const FORBIDDEN_SESSION_ERROR: SessionError = {
  title: '멤버 전용이에요',
  description: '멤버 계정으로 로그인해주세요.',
};

export default function WriteForm() {
  const router = useRouter();
  const [sessionState, setSessionState] = useState<SessionState>('checking');
  const [sessionError, setSessionError] = useState<SessionError>(GENERIC_SESSION_ERROR);
  const [authorName, setAuthorName] = useState('');

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [imageUploading, setImageUploading] = useState(false);
  const [preview, setPreview] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      let me;
      try {
        me = await getCurrentMember();
      } catch (err) {
        if (cancelled) return;
        if (err instanceof MemberApiError && err.status === 401) {
          router.replace(`/member/login?returnTo=${encodeURIComponent(WRITE_PATH)}`);
          return;
        }
        if (err instanceof MemberApiError && err.status === 403) {
          setSessionError(FORBIDDEN_SESSION_ERROR);
          setSessionState('error');
          return;
        }
        setSessionError(GENERIC_SESSION_ERROR);
        setSessionState('error');
        return;
      }
      if (cancelled) return;

      setAuthorName(me.member.name);

      // 임시저장 복원 — await 이후라 이 안에서의 setState는 effect에 동기적이지 않다
      try {
        const raw = localStorage.getItem(DRAFT_KEY);
        if (raw) {
          const draft: Draft = JSON.parse(raw);
          setTitle(draft.title ?? '');
          setContent(draft.content ?? '');
          setThumbnailUrl(draft.thumbnailUrl ?? null);
        }
      } catch {
        // 손상된 draft는 무시하고 빈 폼으로 시작
      }
      setSessionState('ready');
    })();

    return () => {
      cancelled = true;
    };
  }, [router]);

  // 입력이 바뀔 때마다 임시저장 (제출 완료 후에는 저장하지 않음)
  useEffect(() => {
    if (sessionState !== 'ready' || submitted) return;
    try {
      const draft: Draft = { title, content, thumbnailUrl };
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    } catch {
      // 저장 공간 부족 등 — 임시저장은 best-effort라 무시
    }
  }, [title, content, thumbnailUrl, sessionState, submitted]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting || imageUploading) return;
    if (!title.trim() || !content.trim()) {
      setSubmitError('제목과 본문을 모두 입력해 주세요.');
      return;
    }

    setSubmitting(true);
    setSubmitError('');

    const body: PostCreateRequest = {
      title: title.trim(),
      content: content.trim(),
      thumbnailUrl: thumbnailUrl ?? undefined,
    };

    try {
      await createPost(body);
      setSubmitted(true);
      try {
        localStorage.removeItem(DRAFT_KEY);
      } catch {
        // 무시
      }
    } catch (err) {
      setSubmitError(err instanceof FeedApiError ? err.message : '글 작성에 실패했어요.');
    } finally {
      setSubmitting(false);
    }
  }

  if (sessionState === 'checking') {
    return <p className="py-24 text-center text-sm text-muted">확인하고 있어요…</p>;
  }

  if (sessionState === 'error') {
    return <NoticeScreen title={sessionError.title} description={sessionError.description} />;
  }

  if (submitted) {
    return (
      <NoticeScreen
        title="글이 등록됐어요"
        description="새 글을 쓰려면 글쓰기 페이지로 다시 들어와 주세요."
      />
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-1 text-2xl font-bold text-white">글쓰기</h1>
      <p className="mb-8 text-sm text-muted">{authorName} 님으로 작성해요.</p>

      <div className="mb-6 flex justify-end">
        <button
          type="button"
          onClick={() => setPreview((v) => !v)}
          className="rounded-full border border-white/20 px-4 py-1.5 text-sm text-white transition-colors hover:bg-white/10"
        >
          {preview ? '편집으로 돌아가기' : '미리보기'}
        </button>
      </div>

      {preview ? (
        <article>
          <h2 className="mb-4 text-2xl font-bold text-white">{title || '(제목 없음)'}</h2>
          {thumbnailUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={thumbnailUrl}
              alt=""
              className="mb-6 aspect-[16/9] w-full rounded-2xl object-cover"
            />
          ) : null}
          <div className="whitespace-pre-wrap break-words text-base leading-relaxed text-white/90">
            {content || '(본문 없음)'}
          </div>
        </article>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div>
            <label className="mb-2 block text-sm font-medium text-white" htmlFor="post-title">
              제목
            </label>
            <input
              id="post-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none focus:border-white/30"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-white" htmlFor="post-content">
              본문
            </label>
            <textarea
              id="post-content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              required
              rows={12}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none focus:border-white/30"
            />
          </div>

          <ImageUploader
            value={thumbnailUrl}
            onChange={setThumbnailUrl}
            onUploadingChange={setImageUploading}
          />

          {submitError && <p className="text-sm text-red-400">{submitError}</p>}

          <button
            type="submit"
            disabled={submitting || imageUploading}
            className="self-start rounded-full border border-white/20 bg-white/10 px-6 py-2.5 text-sm text-white transition-colors hover:bg-white/20 disabled:opacity-40"
          >
            {submitting ? '등록 중…' : imageUploading ? '이미지 업로드 중…' : '글 등록'}
          </button>
        </form>
      )}
    </div>
  );
}

function NoticeScreen({ title, description }: { title: string; description: string }) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-3 py-24 text-center">
      <p className="text-lg font-bold text-white">{title}</p>
      <p className="text-sm text-muted">{description}</p>
    </div>
  );
}
