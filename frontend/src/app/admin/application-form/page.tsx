import type { Metadata } from 'next';
import ApplicationFormEditor from '@/components/admin/ApplicationFormEditor';

export const metadata: Metadata = {
  title: '지원서 양식 편집 — 어드민',
};

export default function AdminApplicationFormPage() {
  return <ApplicationFormEditor />;
}
