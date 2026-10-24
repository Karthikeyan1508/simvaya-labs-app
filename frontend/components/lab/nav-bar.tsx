import { Droplets, Menu } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from './theme-toggle';

// Divided strip of live readings. Shown from md up.
export function NavStatus({ children }: { children: ReactNode }) {
  return (
    <div className="hidden items-center divide-x divide-border rounded-md bg-foreground/[0.035] text-[13px] whitespace-nowrap md:flex">
      {children}
    </div>
  );
}

// Glass top bar: menu button and brand on the left, live status and theme on the right.
// A hairline along the bottom edge shows progress from 0 to 1. The menu button only shows below lg.
export function NavBar({
  title,
  kicker = 'Experiment 08',
  status,
  progress,
  onMenu,
}: {
  title: string;
  kicker?: string;
  status?: ReactNode;
  progress: number;
  onMenu: () => void;
}) {
  return (
    <header className="glass relative flex h-14 shrink-0 items-center gap-3 overflow-hidden rounded-lg pr-2 pl-2 lg:pl-4">
      <Button variant="ghost" size="icon" className="lg:hidden" onClick={onMenu} aria-label="Open section menu">
        <Menu />
      </Button>

      <Link href="/dashboard" aria-label="Back to dashboard" className="flex items-center gap-2.5">
        <span className="orange-gradient grid size-7 place-items-center rounded-md text-primary-foreground">
          <Droplets className="size-3.5" />
        </span>
        <span className="text-[15px] font-semibold tracking-tight">Simvaya</span>
      </Link>

      <span className="hidden h-5 w-px bg-border md:block" />

      <div className="hidden min-w-0 md:block">
        <p className="text-[11px] leading-none text-muted-foreground">{kicker}</p>
        <p className="mt-1 truncate text-sm leading-none font-medium">{title}</p>
      </div>

      <div className="ml-auto flex items-center gap-1">
        {status}
        {status && <span className="mx-1.5 hidden h-5 w-px bg-border md:block" />}
        <ThemeToggle />
      </div>

      <span
        className="absolute inset-x-0 bottom-0 h-px origin-left bg-primary transition-transform duration-500"
        style={{ transform: `scaleX(${progress})` }}
      />
    </header>
  );
}
