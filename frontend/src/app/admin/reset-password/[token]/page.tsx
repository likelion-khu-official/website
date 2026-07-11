import type { Metadata } from 'next';
import ResetPasswordForm from '@/components/admin/ResetPasswordForm';

export const metadata: Metadata = {
  title: '비밀번호 재설정 — 어드민',
};

export default async function AdminResetPasswordPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return <ResetPasswordForm token={token} />;
}
