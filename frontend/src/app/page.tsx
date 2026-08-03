import type { Metadata } from 'next';
import Nav from '@/components/Nav';
import HomeMotion from '@/components/HomeMotion';
import Thumbnail from '@/components/sections/Thumbnail';
import Introduce from '@/components/sections/Introduce';
import IntroduceSession from '@/components/sections/IntroduceSession';
import Project from '@/components/sections/Project';
import Members from '@/components/sections/Members';
import Plan from '@/components/sections/Plan';
import Blog from '@/components/sections/Blog';
import Faq from '@/components/sections/Faq';
import Recruit from '@/components/sections/Recruit';
import LandingSectionTracker from '@/components/analytics/LandingSectionTracker';

export const metadata: Metadata = {
  alternates: {
    canonical: '/',
  },
};

export default function Home() {
  return (
    <div className="home-experience bg-background text-foreground">
      <HomeMotion />
      <LandingSectionTracker />
      <a
        href="#main-content"
        className="fixed left-4 top-3 z-50 -translate-y-20 rounded-full bg-white px-4 py-2 text-sm font-semibold text-background outline-none transition-transform focus:translate-y-0 focus-visible:ring-2 focus-visible:ring-accent"
      >
        본문 바로가기
      </a>
      <Nav />
      <main id="main-content" tabIndex={-1} className="outline-none">
        <Thumbnail />
        <Introduce />
        <IntroduceSession />
        <Project />
        <Members />
        <Plan />
        <div className="home-blog-chapter">
          <Blog />
        </div>
        <Faq />
        <Recruit />
      </main>
    </div>
  );
}
