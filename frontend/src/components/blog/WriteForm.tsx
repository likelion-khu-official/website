'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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

// 업로드 중 본문에 잠깐 끼워두는 자리표시자에 붙일 고유 토큰. crypto.randomUUID가
// 없는 환경도 있어 시퀀스로 안전하게 만든다.
let uploadSeq = 0;
function nextUploadToken() {
  uploadSeq += 1;
  return `uploading:${Date.now()}-${uploadSeq}`;
}

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

// 본문 마크다운에 들어간 이미지 URL을 등장 순서대로(중복 제거) 뽑는다. 업로드 중 자리표시자
// (`uploading:...`)는 대표 이미지 후보에서 제외한다.
function extractContentImages(content: string): string[] {
  const urls: string[] = [];
  for (const match of content.matchAll(/!\[[^\]]*]\(\s*([^)\s]+)/g)) {
    const url = match[1];
    if (url.startsWith('uploading:')) continue;
    if (!urls.includes(url)) urls.push(url);
  }
  return urls;
}

export default function WriteForm({ postId }: Props) {
  const router = useRouter();
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // 툴바 버튼처럼 textarea에서 포커스가 빠진 뒤에도 마지막 커서/선택 위치를 기억한다.
  const selectionRef = useRef<{ start: number; end: number }>({ start: 0, end: 0 });
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
  const [bodyUploading, setBodyUploading] = useState(false);
  const [mobileView, setMobileView] = useState<'edit' | 'preview'>('edit');
  const [publishOpen, setPublishOpen] = useState(false);
  const [dragging, setDragging] = useState(false);

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

  // 현재 커서/선택 범위. textarea가 포커스돼 있으면 실시간 값을, 아니면 마지막으로
  // 기억해 둔 위치를(툴바 버튼용) 쓴다.
  const currentSelection = useCallback(() => {
    const ta = bodyRef.current;
    if (ta && document.activeElement === ta) {
      return { start: ta.selectionStart, end: ta.selectionEnd };
    }
    return selectionRef.current;
  }, []);

  const restoreCaret = useCallback((start: number, end: number) => {
    requestAnimationFrame(() => {
      const ta = bodyRef.current;
      if (!ta) return;
      ta.focus();
      ta.setSelectionRange(start, end);
      selectionRef.current = { start, end };
    });
  }, []);

  // 커서 위치에 텍스트를 끼워 넣고 캐럿을 삽입 텍스트 뒤로 옮긴다.
  const insertAtCursor = useCallback(
    (text: string) => {
      const { start, end } = currentSelection();
      setContent((prev) => prev.slice(0, start) + text + prev.slice(end));
      restoreCaret(start + text.length, start + text.length);
    },
    [currentSelection, restoreCaret]
  );

  // 선택 영역을 마커로 감싼다(굵게·기울임·코드·링크). 선택이 없으면 placeholder를 넣고
  // 그 부분을 선택 상태로 남겨 바로 덮어쓸 수 있게 한다.
  const wrapSelection = useCallback(
    (before: string, after: string, placeholder: string) => {
      const { start, end } = currentSelection();
      const hadSelection = end > start;
      setContent((prev) => {
        const selected = hadSelection ? prev.slice(start, end) : placeholder;
        return prev.slice(0, start) + before + selected + after + prev.slice(end);
      });
      const innerLen = hadSelection ? end - start : placeholder.length;
      restoreCaret(start + before.length, start + before.length + innerLen);
    },
    [currentSelection, restoreCaret]
  );

  // 커서가 놓인 줄 맨 앞에 접두어를 붙인다(제목·인용).
  const prefixLine = useCallback(
    (prefix: string) => {
      const { start } = currentSelection();
      setContent((prev) => {
        const lineStart = prev.lastIndexOf('\n', start - 1) + 1;
        return prev.slice(0, lineStart) + prefix + prev.slice(lineStart);
      });
      restoreCaret(start + prefix.length, start + prefix.length);
    },
    [currentSelection, restoreCaret]
  );

  const uploadAndInsertImages = useCallback(
    async (files: File[]) => {
      const images = files.filter((file) => file.type.startsWith('image/'));
      if (images.length === 0) return;

      const validationError = images.map(imageValidationMessage).find(Boolean);
      if (validationError) {
        setBodyImageError(validationError);
        return;
      }
      setBodyImageError('');

      // 커서 자리에 자리표시자를 한꺼번에 끼워 넣고, 업로드가 끝나는 대로 각각을
      // 실제 마크다운으로 교체한다. 그 사이에도 계속 타이핑할 수 있다.
      const jobs = images.map((file) => ({ file, token: nextUploadToken() }));
      insertAtCursor(`${jobs.map((job) => `![업로드 중…](${job.token})`).join('\n')}\n`);

      setBodyUploading(true);
      await Promise.all(
        jobs.map(async ({ file, token }) => {
          try {
            const { url } = await uploadMemberImage(file);
            const markdown = `![${markdownImageAlt(file.name)}](${url})`;
            setContent((prev) => prev.replace(`![업로드 중…](${token})`, markdown));
          } catch (error) {
            setContent((prev) => prev.replace(`![업로드 중…](${token})`, ''));
            setBodyImageError(handleWriteError(error, '본문 이미지 업로드에 실패했어요.'));
          }
        })
      );
      setBodyUploading(false);
    },
    // handleWriteError는 매 렌더 새로 만들어지지만 router만 참조하므로 안정적으로 취급한다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [insertAtCursor]
  );

  function handlePaste(event: React.ClipboardEvent<HTMLTextAreaElement>) {
    const files = Array.from(event.clipboardData.files);
    if (files.some((file) => file.type.startsWith('image/'))) {
      event.preventDefault();
      void uploadAndInsertImages(files);
    }
  }

  function handleDrop(event: React.DragEvent<HTMLTextAreaElement>) {
    const files = Array.from(event.dataTransfer.files);
    if (files.some((file) => file.type.startsWith('image/'))) {
      event.preventDefault();
      setDragging(false);
      void uploadAndInsertImages(files);
    }
  }

  async function handleSubmit() {
    if (submitting || bodyUploading) return;
    if (!title.trim() || !content.trim()) {
      setSubmitError('제목과 본문을 모두 입력해 주세요.');
      setPublishOpen(false);
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
      setSubmitting(false);
    }
  }

  // 대표 이미지 후보 = 본문에 들어간 이미지들. early return 앞에 둬야 훅 순서가 안정적이다.
  const contentImages = useMemo(() => extractContentImages(content), [content]);

  if (sessionState === 'checking') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background">
        <p className="text-sm text-muted">확인하고 있어요…</p>
      </div>
    );
  }

  if (sessionState === 'error') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background px-6">
        <div className="flex max-w-md flex-col items-center gap-3 text-center">
          <p className="text-lg font-bold text-white">{sessionError.title}</p>
          <p className="text-sm text-muted">{sessionError.description}</p>
          <Link
            href="/member/posts"
            className="mt-4 inline-flex min-h-11 items-center rounded-full border border-white/15 px-5 py-2 text-sm text-white/65 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            내 글로 돌아가기
          </Link>
        </div>
      </div>
    );
  }

  const canPublish = Boolean(title.trim()) && Boolean(content.trim());

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background text-foreground">
      {/* 모바일 전용 상단 전환 바 — 데스크톱은 좌우 분할이라 필요 없다. */}
      <div className="flex items-center justify-between gap-2 border-b border-white/10 px-4 py-2.5 lg:hidden">
        <Link
          href="/member/posts"
          className="inline-flex min-h-10 items-center gap-1 rounded-md px-2 text-sm text-white/55 transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <span aria-hidden>←</span> 나가기
        </Link>
        <div className="flex rounded-full border border-white/10 p-0.5 text-xs">
          <button
            type="button"
            onClick={() => setMobileView('edit')}
            className={`min-h-9 rounded-full px-4 transition ${
              mobileView === 'edit' ? 'bg-white/10 text-white' : 'text-white/45'
            }`}
          >
            편집
          </button>
          <button
            type="button"
            onClick={() => setMobileView('preview')}
            className={`min-h-9 rounded-full px-4 transition ${
              mobileView === 'preview' ? 'bg-white/10 text-white' : 'text-white/45'
            }`}
          >
            미리보기
          </button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1">
        {/* ── 왼쪽: 에디터 ── */}
        <section
          className={`flex min-h-0 min-w-0 flex-1 flex-col lg:w-1/2 lg:flex-none ${
            mobileView === 'preview' ? 'hidden lg:flex' : 'flex'
          }`}
        >
          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-5 pt-8 sm:px-10 lg:px-12 lg:pt-12">
            <textarea
              value={title}
              onChange={(event) => setTitle(event.target.value.replace(/\n/g, ''))}
              maxLength={200}
              rows={1}
              placeholder="제목을 입력하세요"
              aria-label="제목"
              className="w-full resize-none break-keep bg-transparent text-3xl font-semibold leading-tight tracking-[-0.03em] text-white outline-none placeholder:text-white/25 sm:text-4xl"
            />
            <div className="mt-4 h-1 w-16 rounded-full bg-accent" />

            <input
              type="text"
              value={summary}
              onChange={(event) => setSummary(event.target.value)}
              maxLength={200}
              placeholder="한 줄 소개 (선택) — 목록·검색 결과에 보여요"
              aria-label="한 줄 소개"
              className="mt-5 w-full bg-transparent text-sm text-white/70 outline-none placeholder:text-white/30"
            />

            <EditorToolbar
              onHeading={() => prefixLine('## ')}
              onBold={() => wrapSelection('**', '**', '굵게')}
              onItalic={() => wrapSelection('_', '_', '기울임')}
              onQuote={() => prefixLine('> ')}
              onCode={() => wrapSelection('`', '`', '코드')}
              onLink={() => wrapSelection('[', '](https://)', '링크')}
              onImage={() => fileInputRef.current?.click()}
              uploading={bodyUploading}
            />

            <textarea
              ref={bodyRef}
              value={content}
              onChange={(event) => setContent(event.target.value)}
              onSelect={(event) => {
                selectionRef.current = {
                  start: event.currentTarget.selectionStart,
                  end: event.currentTarget.selectionEnd,
                };
              }}
              onPaste={handlePaste}
              onDrop={handleDrop}
              onDragOver={(event) => {
                if (Array.from(event.dataTransfer.types).includes('Files')) {
                  event.preventDefault();
                  setDragging(true);
                }
              }}
              onDragLeave={() => setDragging(false)}
              aria-label="본문"
              placeholder={'당신의 이야기를 적어보세요...\n\n이미지는 복사한 뒤 붙여넣거나(⌘/Ctrl+V) 끌어다 놓으면 커서 위치에 바로 들어와요.'}
              className={`mt-4 min-h-[40vh] w-full flex-1 resize-none break-words bg-transparent text-[15px] leading-8 text-white/90 outline-none placeholder:text-white/25 ${
                dragging ? 'rounded-lg ring-2 ring-accent/60' : ''
              }`}
            />

            {bodyImageError ? (
              <p role="alert" className="py-2 text-sm text-red-400">
                {bodyImageError}
              </p>
            ) : null}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={(event) => {
              void uploadAndInsertImages(Array.from(event.target.files ?? []));
              if (fileInputRef.current) fileInputRef.current.value = '';
            }}
          />

          {/* 하단 액션 바 */}
          <div className="flex items-center justify-between gap-3 border-t border-white/10 px-5 py-3 sm:px-10 lg:px-12">
            <Link
              href="/member/posts"
              className="hidden min-h-10 items-center gap-1 rounded-md px-2 text-sm text-white/55 transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent lg:inline-flex"
            >
              <span aria-hidden>←</span> 나가기
            </Link>
            <span className="text-xs text-white/30 lg:hidden">{authorName} 님</span>
            <button
              type="button"
              onClick={() => setPublishOpen(true)}
              disabled={!canPublish || submitting || bodyUploading}
              className="min-h-11 rounded-full bg-accent px-6 py-2 text-sm font-semibold text-white outline-none transition-colors hover:bg-[#ff6a26] focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-40"
            >
              {editing ? '수정하기' : '출간하기'}
            </button>
          </div>
        </section>

        {/* ── 오른쪽: 실시간 미리보기 ── */}
        <section
          className={`min-h-0 min-w-0 flex-1 overflow-y-auto border-white/10 bg-white/[0.02] lg:w-1/2 lg:flex-none lg:border-l ${
            mobileView === 'edit' ? 'hidden lg:block' : 'block'
          }`}
        >
          <div className="mx-auto w-full max-w-2xl px-5 py-8 sm:px-10 lg:px-12 lg:py-12">
            <h1 className="break-keep text-3xl font-semibold leading-tight tracking-[-0.03em] text-white sm:text-4xl">
              {title || <span className="text-white/25">제목을 입력하세요</span>}
            </h1>
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
            <MarkdownContent content={content || '*(본문 미리보기가 여기에 표시돼요)*'} />
          </div>
        </section>
      </div>

      {publishOpen ? (
        <PublishModal
          editing={editing}
          hiddenNotice={editing && postStatus === 'HIDDEN'}
          summary={summary}
          onSummaryChange={setSummary}
          contentImages={contentImages}
          thumbnailUrl={thumbnailUrl}
          onThumbnailChange={setThumbnailUrl}
          submitting={submitting}
          submitError={submitError}
          onCancel={() => setPublishOpen(false)}
          onSubmit={handleSubmit}
        />
      ) : null}
    </div>
  );
}

function ToolbarButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      // 클릭으로 textarea 포커스가 빠지기 전에 삽입 로직이 마지막 커서 위치를 쓰도록 한다.
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      aria-label={label}
      title={label}
      className="flex min-h-9 min-w-9 items-center justify-center rounded-md px-2 text-sm text-white/55 outline-none transition hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:ring-accent"
    >
      {children}
    </button>
  );
}

function EditorToolbar({
  onHeading,
  onBold,
  onItalic,
  onQuote,
  onCode,
  onLink,
  onImage,
  uploading,
}: {
  onHeading: () => void;
  onBold: () => void;
  onItalic: () => void;
  onQuote: () => void;
  onCode: () => void;
  onLink: () => void;
  onImage: () => void;
  uploading: boolean;
}) {
  return (
    <div className="sticky top-0 z-10 mt-6 flex flex-wrap items-center gap-0.5 border-y border-white/10 bg-background/90 py-1.5 backdrop-blur">
      <ToolbarButton label="제목" onClick={onHeading}>
        <span className="font-semibold">H</span>
      </ToolbarButton>
      <ToolbarButton label="굵게" onClick={onBold}>
        <span className="font-bold">B</span>
      </ToolbarButton>
      <ToolbarButton label="기울임" onClick={onItalic}>
        <span className="italic">I</span>
      </ToolbarButton>
      <span className="mx-1 h-4 w-px bg-white/10" aria-hidden />
      <ToolbarButton label="인용" onClick={onQuote}>
        <span aria-hidden>❝</span>
      </ToolbarButton>
      <ToolbarButton label="코드" onClick={onCode}>
        <span className="font-mono">{'</>'}</span>
      </ToolbarButton>
      <ToolbarButton label="링크" onClick={onLink}>
        <span aria-hidden>🔗</span>
      </ToolbarButton>
      <span className="mx-1 h-4 w-px bg-white/10" aria-hidden />
      <ToolbarButton label="이미지 추가" onClick={onImage}>
        {uploading ? (
          <span className="text-xs text-accent">업로드…</span>
        ) : (
          <span aria-hidden>🖼️</span>
        )}
      </ToolbarButton>
    </div>
  );
}

function PublishModal({
  editing,
  hiddenNotice,
  summary,
  onSummaryChange,
  contentImages,
  thumbnailUrl,
  onThumbnailChange,
  submitting,
  submitError,
  onCancel,
  onSubmit,
}: {
  editing: boolean;
  hiddenNotice: boolean;
  summary: string;
  onSummaryChange: (value: string) => void;
  contentImages: string[];
  thumbnailUrl: string | null;
  onThumbnailChange: (url: string | null) => void;
  submitting: boolean;
  submitError: string;
  onCancel: () => void;
  onSubmit: () => void;
}) {
  // 후보 = 본문 이미지들. 수정 중인 글의 기존 대표 이미지가 본문에 없더라도 현재 선택으로 보이게 앞에 붙인다.
  const thumbnailCandidates =
    thumbnailUrl && !contentImages.includes(thumbnailUrl)
      ? [thumbnailUrl, ...contentImages]
      : contentImages;
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onCancel();
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onCancel]);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={editing ? '수정 설정' : '출간 설정'}
      onClick={onCancel}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-white/10 bg-background p-6 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 className="text-lg font-semibold text-white">
          {editing ? '수정 내용을 저장할까요?' : '이대로 출간할까요?'}
        </h2>

        <div className="mt-5">
          <p className="mb-1 text-sm font-medium text-white">
            대표 이미지 <span className="font-normal text-white/35">(선택)</span>
          </p>
          <p className="mb-3 text-xs leading-5 text-white/40">
            본문에 넣은 이미지 중 하나를 목록·미리보기의 대표 이미지로 골라요.
          </p>
          {thumbnailCandidates.length === 0 ? (
            <p className="rounded-xl border border-dashed border-white/15 px-4 py-6 text-center text-xs leading-5 text-white/40">
              본문에 이미지를 넣으면 그중 하나를 대표 이미지로 고를 수 있어요.
            </p>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {thumbnailCandidates.map((url) => {
                const selected = url === thumbnailUrl;
                return (
                  <button
                    key={url}
                    type="button"
                    onClick={() => onThumbnailChange(selected ? null : url)}
                    aria-pressed={selected}
                    aria-label={selected ? '대표 이미지 선택 해제' : '대표 이미지로 선택'}
                    className={`relative aspect-[16/10] overflow-hidden rounded-lg border outline-none transition focus-visible:ring-2 focus-visible:ring-accent ${
                      selected ? 'border-accent ring-2 ring-accent' : 'border-white/10 hover:border-white/30'
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt="" className="h-full w-full object-cover" />
                    {selected ? (
                      <span className="absolute right-1 top-1 rounded-full bg-accent px-1.5 py-0.5 text-[10px] font-semibold text-white">
                        대표
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="mt-5">
          <label className="mb-2 block text-sm font-medium text-white" htmlFor="publish-summary">
            한 줄 소개 <span className="font-normal text-white/35">(선택)</span>
          </label>
          <textarea
            id="publish-summary"
            value={summary}
            onChange={(event) => onSummaryChange(event.target.value)}
            maxLength={200}
            rows={3}
            placeholder="목록과 검색 결과에 보일 짧은 소개를 적어주세요."
            className="w-full resize-y rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm leading-6 text-white outline-none focus:border-white/30 focus-visible:ring-2 focus-visible:ring-accent/60"
          />
          <p className="mt-1.5 text-right text-xs text-white/35">{summary.length}/200</p>
        </div>

        <p className="mt-4 rounded-xl border border-accent/20 bg-accent/[0.06] px-4 py-3 text-sm leading-6 text-orange-100/85">
          {hiddenNotice
            ? '관리자가 숨긴 글은 수정해도 숨김 상태가 유지돼요.'
            : editing
              ? '저장한 내용은 공개 글에 즉시 반영돼요.'
              : '등록 즉시 방문자에게 공개돼요. 별도의 초안이나 승인 단계는 없어요.'}
        </p>

        {submitError ? (
          <p role="alert" className="mt-3 text-sm text-red-400">
            {submitError}
          </p>
        ) : null}

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={submitting}
            className="min-h-11 rounded-full border border-white/15 px-5 py-2 text-sm text-white/65 outline-none transition hover:border-white/30 hover:text-white focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-40"
          >
            취소
          </button>
          <button
            type="button"
            onClick={onSubmit}
            disabled={submitting}
            className="min-h-11 rounded-full bg-accent px-6 py-2 text-sm font-semibold text-white outline-none transition-colors hover:bg-[#ff6a26] focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-40"
          >
            {submitting
              ? editing
                ? '저장 중…'
                : '출간 중…'
              : editing
                ? '수정 저장'
                : '출간하기'}
          </button>
        </div>
      </div>
    </div>
  );
}
