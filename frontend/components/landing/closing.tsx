'use client';

import Link from 'next/link';
import { buttonVariants } from '@/components/ui/button';
import { magnetPull, magnetRelease } from './motion';

// The closing call to action and the footer.
export function Closing({
  primaryHref,
  primaryLabel,
  demoHref,
}: {
  primaryHref: string;
  primaryLabel: string;
  demoHref: string;
}) {
  return (
    <>
      <section id="demo" className="mx-auto max-w-7xl scroll-mt-28 px-5 py-32 md:px-10">
        <div className="glow-card relative overflow-hidden rounded-lg border border-border/60 p-8 md:p-16">
          <h2 className="max-w-4xl text-5xl leading-[0.92] font-semibold tracking-[-0.04em] md:text-8xl">
            Start with any <span className="text-gradient-orange">lab.</span>
          </h2>
          <p className="mt-6 max-w-xl text-lg text-muted-foreground">
            Open a lab, or the demo to see all four in one place.
          </p>
          <div className="mt-10 flex flex-wrap gap-3">
            <Link
              href={primaryHref}
              onPointerMove={(e) => magnetPull(e.currentTarget, e.clientX, e.clientY)}
              onPointerLeave={(e) => magnetRelease(e.currentTarget)}
              className={buttonVariants({ size: 'lg' })}
            >
              {primaryLabel}
            </Link>
            <Link href={demoHref} className={buttonVariants({ variant: 'outline', size: 'lg' })}>
              Open the demo
            </Link>
          </div>
        </div>
      </section>

      <footer className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 border-t border-border/60 px-5 py-10 text-sm text-muted-foreground md:px-10">
        <p>© 2026 Simvaya · Virtual labs for engineering colleges</p>
        <div className="flex items-center gap-5">
          <a href="#labs" className="hover:text-foreground">
            Labs
          </a>
          <a href="#how" className="hover:text-foreground">
            How it works
          </a>
          <Link href="/login" className="hover:text-foreground">
            Sign in
          </Link>
        </div>
      </footer>
    </>
  );
}
