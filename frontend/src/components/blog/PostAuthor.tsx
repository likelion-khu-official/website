import type { PostSummary } from '@shared/types/feed';
import { formatDate } from '@/lib/formatDate';

const PART_LABELS: Record<string, string> = {
  PRESIDENT: '회장',
  VICE_PRESIDENT: '부회장',
  BACKEND_LEAD: '백엔드 세션장',
  FRONTEND_LEAD: '프론트엔드 세션장',
  DESIGN_LEAD: '디자인 세션장',
  AI_LEAD: 'AI 세션장',
  PLANNING_HEAD: '기획부장',
  PLANNING_MEMBER: '기획부원',
  PR_HEAD: '홍보부장',
  PR_MEMBER: '홍보부원',
  BACKEND: '백엔드',
  FRONTEND: '프론트엔드',
  DESIGN: '디자인',
  AI: 'AI',
};

type Props = {
  post: Pick<
    PostSummary,
    | 'authorName'
    | 'authorPart'
    | 'authorEmoji'
    | 'authorPhotoUrl'
    | 'publishedAt'
    | 'createdAt'
  >;
  compact?: boolean;
};

function roleLabel(parts: string[]) {
  if (parts.length === 0) return null;
  return parts.map((p) => PART_LABELS[p] ?? p).join(' · ');
}

export default function PostAuthor({ post, compact = false }: Props) {
  const date = post.publishedAt ?? post.createdAt;
  const role = roleLabel(post.authorPart);

  return (
    <div className={`flex min-w-0 items-center ${compact ? 'gap-2.5' : 'gap-3'}`}>
      <div
        aria-hidden
        className={`flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-white/[0.07] ${
          compact ? 'h-8 w-8 text-base' : 'h-11 w-11 text-xl'
        }`}
      >
        {post.authorPhotoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={post.authorPhotoUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <span>{post.authorEmoji ?? post.authorName.slice(0, 1)}</span>
        )}
      </div>
      <div className="min-w-0">
        <p
          className={`truncate font-semibold text-white ${
            compact ? 'text-xs' : 'text-sm'
          }`}
        >
          {post.authorName}
        </p>
        <div
          className={`mt-0.5 flex flex-wrap items-center gap-x-1.5 text-white/40 ${
            compact ? 'text-[11px]' : 'text-xs'
          }`}
        >
          {role ? (
            <>
              <span className="font-medium text-accent">{role}</span>
              <span aria-hidden>·</span>
            </>
          ) : null}
          <time dateTime={date}>{formatDate(date)}</time>
        </div>
      </div>
    </div>
  );
}
