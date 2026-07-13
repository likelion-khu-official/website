import Nav from '@/components/Nav';
import Thumbnail from '@/components/sections/Thumbnail';
import Introduce from '@/components/sections/Introduce';
import IntroduceSession from '@/components/sections/IntroduceSession';
import Project from '@/components/sections/Project';
import Members from '@/components/sections/Members';
import Plan from '@/components/sections/Plan';
import Blog from '@/components/sections/Blog';
import Recruit from '@/components/sections/Recruit';
import Footer from '@/components/sections/Footer';

export default function Home() {
  return (
    <div className="bg-background text-foreground">
      <Nav />
      <main>
        <Thumbnail />
        <Introduce />
        <IntroduceSession />
        <Project />
        <Members />
        <Plan />
        <Blog />
        <Recruit />
      </main>
      <Footer />
    </div>
  );
}
