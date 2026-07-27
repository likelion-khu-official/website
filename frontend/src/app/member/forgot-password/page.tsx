import type { Metadata } from 'next';
import Link from 'next/link';
import NoticeScreen from '@/components/admin/NoticeScreen';

export const metadata: Metadata = {
  title: '비밀번호 찾기 — 멤버',
  robots: { index: false, follow: false },
};

export default function MemberForgotPasswordPage() {
  return (
    <NoticeScreen
      title="비밀번호를 잊으셨나요?"
      description="멤버 계정은 재설정 메일을 보내지 않아요. 관리자에게 문의해주세요."
    >
      <Link
        href="/member/login"
        className="mt-4 inline-flex min-h-11 items-center rounded-full border border-white/20 bg-white/10 px-5 py-2 text-sm text-white outline-none transition-colors hover:bg-white/20 focus-visible:ring-2 focus-visible:ring-accent"
      >
        로그인 페이지로 이동
      </Link>
    </NoticeScreen>
  );
}
