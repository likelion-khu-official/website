import SiteHeader from '@/components/SiteHeader';

// SiteHeader를 layout에 둬서 로딩(members/loading.tsx) 스켈레톤이 뜨는 동안에도
// 헤더가 유지되게 한다 — layout은 네비게이션·로딩 중에도 안 사라지고, loading.tsx는
// 그 안쪽 페이지 자리만 갈아끼우기 때문. blog/projects와 동일한 패턴.
export default function MembersLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-full overflow-x-hidden bg-background text-white">
      <SiteHeader />
      {children}
    </div>
  );
}
