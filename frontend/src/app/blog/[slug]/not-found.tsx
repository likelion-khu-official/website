import Link from 'next/link';

export default function PostNotFound() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col items-center gap-4 py-24 text-center">
      <p className="text-lg font-bold text-white">글을 찾을 수 없어요.</p>
      <p className="text-sm text-muted">삭제되었거나 존재하지 않는 글이에요.</p>
      <Link
        href="/blog"
        className="rounded-full border border-white/20 bg-white/10 px-5 py-2 text-sm text-white transition-colors hover:bg-white/20"
      >
        목록으로 돌아가기
      </Link>
    </div>
  );
}
