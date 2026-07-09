import Link from 'next/link';
import type { PostSummary } from '@shared/types/feed';
import { formatDate } from '@/lib/formatDate';

export default function PostCard({ post }: { post: PostSummary }) {
  const date = formatDate(post.publishedAt ?? post.createdAt);

  return (
    <Link
      href={`/blog/${post.slug}`}
      className="group flex flex-col overflow-hidden rounded-[20px] border border-white/10 bg-white/[0.03] transition-colors hover:border-accent/40 hover:bg-white/[0.06]"
    >
      <div className="aspect-[16/9] w-full shrink-0 overflow-hidden bg-gradient-to-br from-[#3a3a3a] to-[#1c1c1c]">
        {post.thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={post.thumbnailUrl}
            alt=""
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : null}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-5">
        <h2 className="line-clamp-2 text-lg font-bold text-white">{post.title}</h2>
        {post.summary ? (
          <p className="line-clamp-2 text-sm text-muted">{post.summary}</p>
        ) : null}
        <p className="mt-auto pt-2 text-xs font-medium text-accent">
          {post.authorName} · {date}
        </p>
      </div>
    </Link>
  );
}
