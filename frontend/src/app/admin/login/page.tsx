import type { Metadata } from 'next';
import LoginForm from '@/components/admin/LoginForm';

export const metadata: Metadata = {
  title: '로그인 — 어드민',
};

export default function AdminLoginPage() {
  return <LoginForm />;
}
