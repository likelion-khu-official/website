'use client';

import { useEffect, useState } from 'react';
import { getTokenStatus, createPost, FeedApiError } from '@/lib/feedApi';
import type { PostCreateRequest } from '@/types/feed';
import ImageUploader from './ImageUploader';

type TokenState = 'checking' | 'no-token' | 'valid' | 'expired' | 'used' | 'error';

type Draft = {
  title: string;
  content: string;
  thumbnailUrl: string | null;
};

function draftKey(token: string) {
  return `feed-draft:${token}`;
}

export default function WriteForm({ token }: { token: string | null }) {
  const [tokenState, setTokenState] = useState<TokenState>(token ? 'checking' : 'no-token');
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
    if (!token) return;

    let cancelled = false;
    (async () => {
      let status;
      try {
        status = await getTokenStatus(token);
      } catch {
        if (!cancelled) setTokenState('error');
        return;
      }
      if (cancelled) return;

      if (!status.valid) {
        setTokenState(status.reason === 'EXPIRED' ? 'expired' : status.reason === 'USED' ? 'used' : 'error');
        return;
      }

      setAuthorName(status.authorName);
      // 임시저장 복원 — await 이후라 이 안에서의 setState는 effect에 동기적이지 않다
      try {
        const raw = localStorage.getItem(draftKey(token));
        if (raw) {
          const draft: Draft = JSON.parse(raw);
          setTitle(draft.title ?? '');
          setContent(draft.content ?? '');
          setThumbnailUrl(draft.thumbnailUrl ?? null);
        }
      } catch {
        // 손상된 draft는 무시하고 빈 폼으로 시작
      }
      setTokenState('valid');
    })();

    return () => {
      cancelled = true;
    };
  }, [token]);

  // 입력이 바뀔 때마다 임시저장 (제출 완료 후에는 저장하지 않음)
  useEffect(() => {
    if (tokenState !== 'valid' || !token || submitted) return;
    try {
      const draft: Draft = { title, content, thumbnailUrl };
      localStorage.setItem(draftKey(token), JSON.stringify(draft));
    } catch {
      // 저장 공간 부족 등 — 임시저장은 best-effort라 무시
    }
  }, [title, content, thumbnailUrl, tokenState, token, submitted]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting || imageUploading || !token) return;
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
      await createPost(body, token);
      setSubmitted(true);
      try {
        localStorage.removeItem(draftKey(token));
      } catch {
        // 무시
      }
    } catch (err) {
      setSubmitError(err instanceof FeedApiError ? err.message : '글 작성에 실패했어요.');
    } finally {
      setSubmitting(false);
    }
  }

  if (tokenState === 'checking') {
    return <p className="py-24 text-center text-sm text-muted">확인하고 있어요…</p>;
  }

  if (tokenState === 'no-token') {
    return (
      <NoticeScreen
        title="접근할 수 없어요"
        description="글 작성 링크가 필요해요. 운영진에게 받은 링크로 다시 접속해 주세요."
      />
    );
  }

  if (tokenState === 'expired') {
    return (
      <NoticeScreen
        title="링크가 만료됐어요"
        description="이 글쓰기 링크는 유효 시간이 지났어요. 운영진에게 새 링크를 요청해 주세요."
      />
    );
  }

  if (tokenState === 'used') {
    return (
      <NoticeScreen
        title="이미 사용된 링크예요"
        description="이 글쓰기 링크는 이미 한 번 사용됐어요. 새 글을 쓰려면 새 링크가 필요해요."
      />
    );
  }

  if (tokenState === 'error') {
    return (
      <NoticeScreen
        title="확인하지 못했어요"
        description="링크 상태를 확인하는 중 문제가 생겼어요. 잠시 후 다시 시도해 주세요."
      />
    );
  }

  if (submitted) {
    return (
      <NoticeScreen
        title="글이 등록됐어요"
        description="이 링크는 1회용이라 이제 다시 쓸 수 없어요. 새 글을 쓰려면 운영진에게 새 링크를 요청해 주세요."
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
