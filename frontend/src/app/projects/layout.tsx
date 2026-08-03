import SiteHeader from '@/components/SiteHeader';

export default function ProjectsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen min-h-[100svh] w-full overflow-x-hidden bg-background text-white">
      <SiteHeader />
      {children}
    </div>
  );
}
