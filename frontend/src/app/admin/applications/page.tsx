import type { Metadata } from 'next';
import ApplicationList from '@/components/admin/ApplicationList';

export const metadata: Metadata = {
  title: '지원자 — 어드민',
};

export default function AdminApplicationsPage() {
  return <ApplicationList />;
}
