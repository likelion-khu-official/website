import type { Metadata } from 'next';
import { getPosts } from '@/lib/feedApi';
import { getBaseUrl } from '@/lib/serverBaseUrl';
import PostCard from '@/components/blog/PostCard';
import Pagination from '@/components/blog/Pagination';

export const metadata: Metadata = {
  title: '블로그 — 멋쟁이사자처럼 경희대',
  description: '동아리 활동 속에서 얻은 인사이트를 기록합니다.',
};

export default async function BlogPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page: pageParam } = await searchParams;
  const parsed = Number(pageParam);
  const page = Number.isInteger(parsed) && parsed >= 0 ? parsed : 0;

  const baseUrl = await getBaseUrl();
  const { content, number, totalPages, first, last } = await getPosts(page, baseUrl);

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="mb-10 text-3xl font-bold text-white">블로그</h1>

      {content.length === 0 ? (
        <p className="py-24 text-center text-sm text-muted">아직 등록된 글이 없어요.</p>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {content.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      )}

      <Pagination page={number} totalPages={totalPages} first={first} last={last} />
    </div>
  );
}
