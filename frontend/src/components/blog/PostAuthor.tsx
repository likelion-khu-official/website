import type { PostSummary } from '@shared/types/feed';
import { formatDate } from '@/lib/formatDate';
import AuthorNameModalTrigger from './AuthorNameModalTrigger';

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
    | 'authorMemberId'
    | 'authorPart'
    | 'authorEmoji'
    | 'authorPhotoUrl'
    | 'coauthors'
    | 'publishedAt'
    | 'createdAt'
  >;
  compact?: boolean;
  interactiveNames?: boolean;
};

function roleLabel(parts: string[]) {
  if (parts.length === 0) return null;
  return parts.map((p) => PART_LABELS[p] ?? p).join(' · ');
}

export default function PostAuthor({ post, compact = false, interactiveNames = false }: Props) {
  const date = post.publishedAt ?? post.createdAt;
  // 여러 사람이 함께 쓴 글에서는 한 사람의 직책만 대표처럼 보이지 않게 이름만 노출한다.
  const role = (post.coauthors ?? []).length === 0 ? roleLabel(post.authorPart) : null;
  const authors = [
    {
      key: `primary-${post.authorName}`,
      memberId: post.authorMemberId,
      name: post.authorName,
      emoji: post.authorEmoji,
      photoUrl: post.authorPhotoUrl,
    },
    ...(post.coauthors ?? []).map((author, index) => ({
      key: `coauthor-${author.memberId ?? `${author.name}-${index}`}`,
      memberId: author.memberId,
      name: author.name,
      emoji: author.emoji,
      photoUrl: author.photoUrl,
    })),
  ];
  const visibleAvatars = authors.slice(0, 3);

  return (
    <div className={`flex min-w-0 items-center ${compact ? 'gap-2.5' : 'gap-3'}`}>
      <div className="flex shrink-0 -space-x-2" aria-hidden>
        {visibleAvatars.map((author) => (
          <div
            key={author.key}
            className={`flex items-center justify-center overflow-hidden rounded-full border-2 border-background bg-white/[0.07] ${
              compact ? 'h-8 w-8 text-base' : 'h-11 w-11 text-xl'
            }`}
          >
            {author.photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={author.photoUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <span>{author.emoji ?? author.name.slice(0, 1)}</span>
            )}
          </div>
        ))}
        {authors.length > visibleAvatars.length ? (
          <span
            className={`flex items-center justify-center rounded-full border-2 border-background bg-white/10 font-semibold text-white/65 ${
              compact ? 'h-8 w-8 text-[10px]' : 'h-11 w-11 text-xs'
            }`}
          >
            +{authors.length - visibleAvatars.length}
          </span>
        ) : null}
      </div>
      <div className="min-w-0">
        <p
          className={`${compact ? 'truncate' : 'line-clamp-2'} font-semibold text-white ${
            compact ? 'text-xs' : 'text-sm'
          }`}
        >
          {authors.map((author, index) => (
            <span key={author.key}>
              {index > 0 ? <span className="text-white/45" aria-hidden> · </span> : null}
              {interactiveNames && author.memberId != null ? (
                <AuthorNameModalTrigger memberId={author.memberId} name={author.name} />
              ) : (
                author.name
              )}
            </span>
          ))}
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
