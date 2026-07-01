import Link from 'next/link';
import NotificationForm from '@/components/NotificationForm';

const navLinks = [
  { href: '/projects', label: '프로젝트' },
  { href: '/members', label: '멤버' },
  { href: '/activities', label: '활동' },
  { href: '/blog', label: '블로그' },
  { href: '/recruit', label: '모집' },
];

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-gray-100">
        <nav className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="font-semibold text-sm">
            멋쟁이사자처럼 @ 경희대
          </Link>
          <ul className="flex gap-6">
            {navLinks.map(({ href, label }) => (
              <li key={href}>
                <Link href={href} className="text-sm text-gray-500 hover:text-black transition-colors">
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </header>

      <main className="flex-1 max-w-4xl mx-auto px-6 w-full">
        {/* Hero */}
        <section className="py-24 flex flex-col gap-4">
          <h1 className="text-4xl font-bold tracking-tight">
            멋쟁이사자처럼 @ 경희대
          </h1>
          <p className="text-lg text-gray-500 max-w-md">
            코딩으로 성장하는 경희대 개발 동아리. 함께 만들고, 함께 배워요.
          </p>
        </section>

        {/* 모집 알림 */}
        <section className="py-16 border-t border-gray-100 flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <h2 className="text-xl font-semibold">모집 알림 받기</h2>
            <p className="text-sm text-gray-500">
              다음 모집이 시작되면 가장 먼저 알려드릴게요.
            </p>
          </div>
          <NotificationForm />
        </section>
      </main>

      <footer className="border-t border-gray-100">
        <div className="max-w-4xl mx-auto px-6 h-14 flex items-center">
          <p className="text-xs text-gray-400">
            © 2025 멋쟁이사자처럼 at 경희대
          </p>
        </div>
      </footer>
    </div>
  );
}
