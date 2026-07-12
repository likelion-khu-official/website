import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getPostBySlug } from '@/lib/feedApi';
import { getBaseUrl } from '@/lib/serverBaseUrl';
import { formatDate } from '@/lib/formatDate';
import CommentSection from '@/components/blog/CommentSection';

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const baseUrl = await getBaseUrl();
  const post = await getPostBySlug(slug, baseUrl).catch(() => null);

  if (!post) {
    return { title: '글을 찾을 수 없어요 — 멋쟁이사자처럼 경희대' };
  }

  const description = post.summary ?? post.content.slice(0, 100);

  return {
    title: `${post.title} — 멋쟁이사자처럼 경희대`,
    description,
    openGraph: {
      title: post.title,
      description,
      type: 'article',
      images: post.thumbnailUrl ? [{ url: post.thumbnailUrl }] : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description,
    },
  };
}

export default async function PostPage({ params }: Props) {
  const { slug } = await params;
  const baseUrl = await getBaseUrl();
  const post = await getPostBySlug(slug, baseUrl);

  if (!post) notFound();

  return (
    <article className="mx-auto max-w-3xl">
      <header className="mb-8 flex flex-col gap-3">
        <h1 className="text-3xl font-bold text-white sm:text-4xl">{post.title}</h1>
        <p className="text-sm font-medium text-accent">
          {post.authorName} · {formatDate(post.publishedAt ?? post.createdAt)}
        </p>
      </header>

      {post.thumbnailUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={post.thumbnailUrl}
          alt=""
          className="mb-8 aspect-[16/9] w-full rounded-2xl object-cover"
        />
      ) : null}

      <div className="whitespace-pre-wrap break-words text-base leading-relaxed text-white/90">
        {post.content}
      </div>

      <hr className="my-12 border-white/10" />

      <CommentSection postId={post.id} initialCount={post.commentCount} />
    </article>
  );
}
