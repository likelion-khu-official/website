import type { Metadata } from 'next';
import CommentModeration from '@/components/admin/CommentModeration';

export const metadata: Metadata = {
  title: '댓글 검열 — 어드민',
};

export default function AdminCommentsPage() {
  return <CommentModeration />;
}
