import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getPostBySlug } from '@/lib/feedApi';
import { getBaseUrl } from '@/lib/serverBaseUrl';
import CommentSection from '@/components/blog/CommentSection';
import MarkdownContent, { markdownIncludesImage } from '@/components/blog/MarkdownContent';
import PostAuthor from '@/components/blog/PostAuthor';
import PostThumbnail from '@/components/blog/PostThumbnail';

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
    <article className="mx-auto w-full max-w-[848px] px-5 sm:px-10">
      <header className="mb-8 flex flex-col gap-3">
        <h1 className="text-balance break-keep text-3xl font-bold text-white sm:text-4xl">
          {post.title}
        </h1>
        <PostAuthor post={post} />
      </header>

      {post.thumbnailUrl && !markdownIncludesImage(post.content, post.thumbnailUrl) ? (
        <PostThumbnail src={post.thumbnailUrl} />
      ) : null}

      <MarkdownContent content={post.content} />

      <hr className="my-12 border-white/10" />

      <CommentSection postId={post.id} initialCount={post.commentCount} />
    </article>
  );
}
