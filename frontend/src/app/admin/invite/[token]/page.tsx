import type { Metadata } from 'next';
import InviteAcceptForm from '@/components/admin/InviteAcceptForm';

export const metadata: Metadata = {
  title: '초대 수락 — 어드민',
};

export default async function AdminInvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return <InviteAcceptForm token={token} />;
}
