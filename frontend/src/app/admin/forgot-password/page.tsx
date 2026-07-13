import type { Metadata } from 'next';
import ForgotPasswordForm from '@/components/admin/ForgotPasswordForm';

export const metadata: Metadata = {
  title: '비밀번호 찾기 — 어드민',
};

export default function AdminForgotPasswordPage() {
  return <ForgotPasswordForm />;
}
