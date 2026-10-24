'use client';

import { useSession } from '@/components/app/session-provider';
import { Closing } from './closing';
import { CodeBand } from './code-band';
import { EngineHero } from './engine-hero';
import { Features } from './features';
import { LandingShader } from './landing-shader';
import { Marquee } from './marquee';
import { Nav } from './nav';
import { Steps } from './steps';

// The landing page. Visitors and signed-in users both see it; the calls to action follow the session.
export function Landing() {
  const { status } = useSession();
  const authed = status === 'authed';
  const primaryHref = authed ? '/dashboard' : '/login';
  const demoHref = authed ? '/dashboard/demo' : '/login';

  return (
    <main className="relative min-h-dvh overflow-x-clip text-foreground">
      <LandingShader />
      <Nav />
      <EngineHero primaryHref={primaryHref} primaryLabel="Start a lab" />
      <Marquee />
      <Features />
      <Steps />
      <CodeBand />
      <Closing primaryHref={primaryHref} primaryLabel="Start a lab" demoHref={demoHref} />
    </main>
  );
}
