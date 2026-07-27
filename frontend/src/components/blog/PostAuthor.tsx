import type { PostSummary } from '@shared/types/feed';
import { formatDate } from '@/lib/formatDate';

const PART_LABELS: Record<string, string> = {
  PM: '기획',
  FE: '프론트엔드',
  BE: '백엔드',
  DESIGN: '디자인',
  AI: 'AI',
  INFRA: '인프라',
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

function roleLabel(part: string | null) {
  if (!part) return null;
  return PART_LABELS[part] ?? part;
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
