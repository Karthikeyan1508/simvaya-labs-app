'use client';

import { Droplets } from 'lucide-react';
import Link from 'next/link';
import { useSession } from '@/components/app/session-provider';
import { ThemeToggle } from '@/components/lab/theme-toggle';
import { buttonVariants } from '@/components/ui/button';

const LINKS = [
  { href: '#labs', label: 'Labs' },
  { href: '#how', label: 'How it works' },
  { href: '#demo', label: 'Demo' },
];

// A floating glass bar that stays at the top of the landing page.
export function Nav() {
  const { status } = useSession();
  const authed = status === 'authed';
  const home = '/dashboard';

  return (
    <header className="fixed inset-x-0 top-4 z-40 mx-auto flex w-[min(1100px,calc(100%-2rem))] items-center gap-6 rounded-lg border border-border/60 bg-background/70 py-2.5 pr-2.5 pl-3 backdrop-blur-xl">
      <Link href="/" className="flex items-center gap-2.5">
        <span className="orange-gradient grid size-8 place-items-center rounded-md text-primary-foreground shadow-[0_10px_24px_-14px_rgba(217,119,6,0.9)]">
          <Droplets className="size-4" />
        </span>
        <span className="font-semibold tracking-tight">Simvaya</span>
      </Link>

      <nav aria-label="Landing" className="hidden items-center gap-1 md:flex">
        {LINKS.map((l) => (
          <a
            key={l.href}
            href={l.href}
            className="rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground"
          >
            {l.label}
          </a>
        ))}
      </nav>

      <div className="ml-auto flex items-center gap-1">
        <ThemeToggle />
        <Link href={authed ? home : '/login'} className={buttonVariants({ size: 'sm' })}>
          {authed ? 'Dashboard' : 'Sign in'}
        </Link>
      </div>
    </header>
  );
}
