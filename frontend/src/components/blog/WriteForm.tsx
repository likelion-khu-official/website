'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { PostCreateRequest, PostReplaceRequest, PostStatus } from '@shared/types/feed';
import {
  createPost,
  getCurrentMember,
  getMemberPost,
  MemberApiError,
  replacePost,
  uploadMemberImage,
} from '@/lib/memberApi';
import MemberProjectHeader from '@/components/member/projects/MemberProjectHeader';
import ImageUploader from './ImageUploader';
import MarkdownContent, { markdownIncludesImage } from './MarkdownContent';

type SessionState = 'checking' | 'ready' | 'error';

type SessionError = {
  title: string;
  description: string;
};

type Draft = {
  title: string;
  summary: string;
  content: string;
  thumbnailUrl: string | null;
};

type Props = {
  postId?: number;
};

const DRAFT_KEY = 'feed-write-draft';
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

const GENERIC_SESSION_ERROR: SessionError = {
  title: '화면을 준비하지 못했어요',
  description: '로그인 상태와 글 정보를 확인하는 중 문제가 생겼어요. 잠시 후 다시 시도해 주세요.',
};

const FORBIDDEN_SESSION_ERROR: SessionError = {
  title: '수정할 수 없는 글이에요',
  description: '이 글을 작성한 멤버만 내용을 수정할 수 있어요.',
};

function sendToLogin(router: ReturnType<typeof useRouter>, returnTo: string) {
  router.replace(`/member/login?returnTo=${encodeURIComponent(returnTo)}`);
}

function imageValidationMessage(file: File) {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return `${file.name}: jpg·png·webp·gif 형식만 업로드할 수 있어요.`;
  }
  if (file.size > MAX_IMAGE_SIZE) {
    return `${file.name}: 5MB 이하 파일만 업로드할 수 있어요.`;
  }
  return null;
}

function markdownImageAlt(filename: string) {
  return filename.replace(/\.[^.]+$/, '').replace(/[[\]]/g, '').trim() || '본문 이미지';
}

export default function WriteForm({ postId }: Props) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pagePath = postId ? `/member/posts/${postId}/edit` : '/member/write';
  const editing = postId !== undefined;

  const [sessionState, setSessionState] = useState<SessionState>('checking');
  const [sessionError, setSessionError] = useState<SessionError>(GENERIC_SESSION_ERROR);
  const [authorName, setAuthorName] = useState('');
  const [postStatus, setPostStatus] = useState<PostStatus>('PUBLISHED');

  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [content, setContent] = useState('');
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [thumbnailUploading, setThumbnailUploading] = useState(false);
  const [bodyUploading, setBodyUploading] = useState(false);
  const [preview, setPreview] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [bodyImageError, setBodyImageError] = useState('');

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const [{ member }, post] = await Promise.all([
          getCurrentMember(),
          postId ? getMemberPost(postId) : Promise.resolve(undefined),
        ]);
        if (cancelled) return;
        if (member.mustChangePassword) {
          sendToLogin(router, pagePath);
          return;
        }

        setAuthorName(member.name);
        if (post) {
          setTitle(post.title);
          setSummary(post.summary ?? '');
          setContent(post.content);
          setThumbnailUrl(post.thumbnailUrl);
          setPostStatus(post.status);
        } else {
          try {
            const raw = localStorage.getItem(DRAFT_KEY);
            if (raw) {
              const draft: Draft = JSON.parse(raw);
              setTitle(draft.title ?? '');
              setSummary(draft.summary ?? '');
              setContent(draft.content ?? '');
              setThumbnailUrl(draft.thumbnailUrl ?? null);
            }
          } catch {
            // 손상된 임시저장은 무시하고 빈 폼으로 시작한다.
          }
        }
        setSessionState('ready');
      } catch (error) {
        if (cancelled) return;
        if (error instanceof MemberApiError && error.status === 401) {
          sendToLogin(router, pagePath);
          return;
        }
        if (error instanceof MemberApiError && error.code === 'NOT_POST_AUTHOR') {
          setSessionError(FORBIDDEN_SESSION_ERROR);
        } else if (error instanceof MemberApiError && error.status === 404) {
          setSessionError({
            title: '글을 찾을 수 없어요',
            description: '삭제됐거나 존재하지 않는 글이에요.',
          });
        } else {
          setSessionError(GENERIC_SESSION_ERROR);
        }
        setSessionState('error');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [pagePath, postId, router]);

  useEffect(() => {
    if (editing || sessionState !== 'ready') return;
    try {
      const draft: Draft = { title, summary, content, thumbnailUrl };
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    } catch {
      // 임시저장은 best-effort다.
    }
  }, [content, editing, sessionState, summary, thumbnailUrl, title]);

  function handleWriteError(error: unknown, fallback: string) {
    if (
      error instanceof MemberApiError &&
      (error.status === 401 || error.code === 'MUST_CHANGE_PASSWORD')
    ) {
      sendToLogin(router, pagePath);
      return '';
    }
    return error instanceof Error ? error.message : fallback;
  }

  async function handleBodyImages(files: File[]) {
    if (bodyUploading || files.length === 0) return;

    const validationError = files.map(imageValidationMessage).find(Boolean);
    if (validationError) {
      setBodyImageError(validationError);
      return;
    }

    setBodyUploading(true);
    setBodyImageError('');
    try {
      for (const file of files) {
        const { url } = await uploadMemberImage(file);
        const imageMarkdown = `![${markdownImageAlt(file.name)}](${url})`;
        setContent((current) => `${current.trimEnd()}${current.trim() ? '\n\n' : ''}${imageMarkdown}\n`);
      }
    } catch (error) {
      setBodyImageError(handleWriteError(error, '본문 이미지 업로드에 실패했어요.'));
    } finally {
      setBodyUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (submitting || thumbnailUploading || bodyUploading) return;
    if (!title.trim() || !content.trim()) {
      setSubmitError('제목과 본문을 모두 입력해 주세요.');
      return;
    }

    setSubmitting(true);
    setSubmitError('');

    try {
      let saved;
      if (postId) {
        const body: PostReplaceRequest = {
          title: title.trim(),
          summary: summary.trim() || null,
          content: content.trim(),
          thumbnailUrl,
        };
        saved = await replacePost(postId, body);
      } else {
        const body: PostCreateRequest = {
          title: title.trim(),
          summary: summary.trim() || undefined,
          content: content.trim(),
          thumbnailUrl: thumbnailUrl ?? undefined,
        };
        saved = await createPost(body);
        try {
          localStorage.removeItem(DRAFT_KEY);
        } catch {
          // 등록은 끝났으므로 임시저장 제거 실패가 결과를 막지 않는다.
        }
      }

      router.push(saved.status === 'PUBLISHED' ? `/blog/${saved.slug}` : '/member/posts');
      router.refresh();
    } catch (error) {
      setSubmitError(handleWriteError(error, editing ? '글 수정에 실패했어요.' : '글 등록에 실패했어요.'));
    } finally {
      setSubmitting(false);
    }
  }

  if (sessionState === 'checking') {
    return (
      <div className="mx-auto w-full max-w-6xl">
        <MemberProjectHeader />
        <p className="py-24 text-center text-sm text-muted">확인하고 있어요…</p>
      </div>
    );
  }

  if (sessionState === 'error') {
    return (
      <div className="mx-auto w-full max-w-6xl">
        <MemberProjectHeader />
        <NoticeScreen title={sessionError.title} description={sessionError.description} />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-6xl">
      <MemberProjectHeader memberName={authorName} />

      <div className="border-b border-white/10 pb-10">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-accent">
          Blog
        </p>
        <h1 className="mt-4 text-4xl font-semibold tracking-[-0.05em] text-white sm:text-6xl">
          {editing ? '글 수정' : '새 글 작성'}
        </h1>
        <p className="mt-4 text-sm leading-6 text-white/45">
          {authorName}님의 블로그 글을 Markdown으로 작성해요.
        </p>
      </div>

      <div className="mx-auto mt-10 w-full max-w-3xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/member/posts"
            className="inline-flex min-h-11 items-center rounded-md text-sm text-white/45 transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <span aria-hidden>←</span>&nbsp; 내 글
          </Link>
          <button
            type="button"
            onClick={() => setPreview((current) => !current)}
            className="min-h-11 rounded-full border border-white/20 px-4 py-1.5 text-sm text-white outline-none transition-colors hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-accent"
          >
            {preview ? '편집으로 돌아가기' : '미리보기'}
          </button>
        </div>

        {preview ? (
          <article className="rounded-3xl border border-white/10 bg-white/[0.02] p-5 sm:p-8">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-accent">
              Preview
            </p>
            <h2 className="break-keep text-3xl font-semibold tracking-[-0.04em] text-white">
              {title || '(제목 없음)'}
            </h2>
            {summary ? <p className="mt-4 text-base leading-7 text-white/55">{summary}</p> : null}
            {thumbnailUrl && !markdownIncludesImage(content, thumbnailUrl) ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={thumbnailUrl}
                alt=""
                className="my-8 aspect-[16/9] w-full rounded-2xl object-cover"
              />
            ) : (
              <hr className="my-8 border-white/10" />
            )}
            <MarkdownContent content={content || '*(본문 없음)*'} />
          </article>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-6">
            <div>
              <label className="mb-2 block text-sm font-medium text-white" htmlFor="post-title">
                제목
              </label>
              <input
                id="post-title"
                type="text"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                maxLength={200}
                required
                className="min-h-11 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none focus:border-white/30 focus-visible:ring-2 focus-visible:ring-accent/60"
              />
              <p className="mt-1.5 text-right text-xs text-white/35">{title.length}/200</p>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-white" htmlFor="post-summary">
                한 줄 소개 <span className="font-normal text-white/35">(선택)</span>
              </label>
              <textarea
                id="post-summary"
                value={summary}
                onChange={(event) => setSummary(event.target.value)}
                maxLength={200}
                rows={3}
                className="w-full resize-y rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm leading-6 text-white outline-none focus:border-white/30 focus-visible:ring-2 focus-visible:ring-accent/60"
                placeholder="목록과 검색 결과에 보일 짧은 소개를 적어주세요."
              />
              <p className="mt-1.5 text-right text-xs text-white/35">{summary.length}/200</p>
            </div>

            <div>
              <div className="mb-2 flex flex-wrap items-end justify-between gap-2">
                <label className="text-sm font-medium text-white" htmlFor="post-content">
                  본문
                </label>
                <span className="text-xs text-white/35">
                  Markdown 문법을 사용할 수 있어요.
                </span>
              </div>
              <textarea
                id="post-content"
                value={content}
                onChange={(event) => setContent(event.target.value)}
                required
                rows={24}
                className="w-full resize-y rounded-xl border border-white/10 bg-white/5 px-4 py-3 font-mono text-sm leading-6 text-white outline-none focus:border-white/30 focus-visible:ring-2 focus-visible:ring-accent/60"
                placeholder={'## 소제목\n\n배운 내용을 적어주세요.'}
              />
            </div>

            <div className="rounded-2xl border border-dashed border-white/15 p-4">
              <p className="text-sm font-medium text-white">본문 이미지</p>
              <p className="mt-1 text-xs leading-5 text-white/40">
                이미지를 고르면 OCI에 업로드한 뒤 현재 본문 끝에 Markdown 이미지 문법을
                추가해요.
              </p>
              <label className="mt-4 inline-flex min-h-11 cursor-pointer items-center rounded-full border border-white/15 px-4 py-2 text-sm text-white/65 transition hover:border-white/30 hover:text-white focus-within:ring-2 focus-within:ring-accent">
                {bodyUploading ? '업로드 중…' : '이미지 추가'}
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  disabled={bodyUploading}
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="hidden"
                  onChange={(event) => void handleBodyImages(Array.from(event.target.files ?? []))}
                />
              </label>
              {bodyImageError ? (
                <p role="alert" className="mt-2 text-sm text-red-400">
                  {bodyImageError}
                </p>
              ) : null}
            </div>

            <ImageUploader
              value={thumbnailUrl}
              onChange={setThumbnailUrl}
              onUploadingChange={setThumbnailUploading}
            />

            <div className="rounded-2xl border border-accent/20 bg-accent/[0.06] px-5 py-4">
              <p className="text-sm leading-6 text-orange-100/85">
                {editing && postStatus === 'HIDDEN'
                  ? '관리자가 숨긴 글은 수정해도 숨김 상태가 유지돼요.'
                  : editing
                    ? '저장한 내용은 공개 글에 즉시 반영돼요.'
                    : '등록 즉시 방문자에게 공개돼요. 별도의 초안이나 승인 단계는 없어요.'}
              </p>
            </div>

            {submitError ? (
              <p role="alert" className="text-sm text-red-400">
                {submitError}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={submitting || thumbnailUploading || bodyUploading}
              className="min-h-12 self-stretch rounded-full bg-accent px-6 py-3 text-sm font-semibold text-white outline-none transition-colors hover:bg-[#ff6a26] focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-40 sm:self-start"
            >
              {submitting
                ? editing
                  ? '저장 중…'
                  : '등록 중…'
                : thumbnailUploading || bodyUploading
                  ? '이미지 업로드 중…'
                  : editing
                    ? '변경사항 저장'
                    : '글 등록'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

function NoticeScreen({ title, description }: { title: string; description: string }) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-3 py-24 text-center">
      <p className="text-lg font-bold text-white">{title}</p>
      <p className="text-sm text-muted">{description}</p>
      <Link
        href="/member/posts"
        className="mt-4 inline-flex min-h-11 items-center rounded-full border border-white/15 px-5 py-2 text-sm text-white/65 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        내 글로 돌아가기
      </Link>
    </div>
  );
}
