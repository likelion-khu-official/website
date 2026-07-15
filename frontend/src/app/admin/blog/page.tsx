import type { Metadata } from 'next';
import BlogManager from '@/components/admin/BlogManager';

export const metadata: Metadata = {
  title: '블로그 관리 — 어드민',
};

export default function AdminBlogPage() {
  return <BlogManager />;
}
