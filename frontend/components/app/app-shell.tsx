'use client';

import { Activity, Award, CalendarDays, Droplets, GraduationCap, LayoutGrid, Layers, Menu, Settings, Table2, type LucideIcon } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { ThemeToggle } from '@/components/lab/theme-toggle';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { useSession } from './session-provider';
import { UserMenu } from './user-menu';

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  exact: boolean;
}

const STUDENT_NAV: NavItem[] = [
  { href: '/dashboard', label: 'Overview', icon: LayoutGrid, exact: true },
  { href: '/dashboard/demo', label: 'Demo', icon: Layers, exact: false },
  { href: '/dashboard/recordings', label: 'Recordings', icon: Table2, exact: false },
  { href: '/dashboard/activity', label: 'Activity', icon: Activity, exact: false },
  { href: '/dashboard/scores', label: 'Scores', icon: Award, exact: false },
  { href: '/dashboard/viva', label: 'Viva', icon: GraduationCap, exact: false },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings, exact: false },
];

const isActive = (pathname: string, item: NavItem) =>
  item.exact ? pathname === item.href : pathname.startsWith(item.href);

function SideNav({ items, pathname, onNavigate }: { items: NavItem[]; pathname: string; onNavigate?: () => void }) {
  return (
    <nav aria-label="Main" className="flex flex-col gap-0.5">
      {items.map((item) => {
        const Icon = item.icon;
        const on = isActive(pathname, item);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={on ? 'page' : undefined}
            className={cn(
              'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
              on
                ? 'bg-foreground/[0.06] font-medium text-foreground'
                : 'text-muted-foreground hover:bg-foreground/[0.04] hover:text-foreground',
            )}
          >
            <Icon className={cn('size-4', on && 'text-primary')} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

function Brand({ href }: { href: string }) {
  return (
    <Link href={href} className="flex items-center gap-2.5 px-1">
      <span className="orange-gradient grid size-8 place-items-center rounded-md text-primary-foreground shadow-[0_10px_24px_-14px_rgba(217,119,6,0.9)]">
        <Droplets className="size-4" />
      </span>
      <span className="leading-tight">
        <span className="block text-[15px] font-semibold tracking-tight">Simvaya</span>
        <span className="block text-[11px] text-muted-foreground">Virtual Lab</span>
      </span>
    </Link>
  );
}

// Signed-in workspace for students: sidebar on large screens, drawer on smaller ones.
export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);
  const home = '/dashboard';
  const current = STUDENT_NAV.find((item) => isActive(pathname, item));

  return (
    <div className="flex min-h-dvh bg-background">
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col justify-between p-4 lg:flex">
        <div className="space-y-8 pt-1">
          <Brand href={home} />
          <SideNav items={STUDENT_NAV} pathname={pathname} />
        </div>
        <div className="space-y-1 rounded-lg bg-foreground/[0.035] p-3">
          <p className="flex items-center gap-2 text-xs text-muted-foreground">
            <CalendarDays className="size-3.5" /> Active semester
          </p>
          <p className="num text-sm font-medium">Semester {user?.semester ?? '—'}</p>
          <p className="text-xs text-muted-foreground">{user?.branch}</p>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 bg-background/85 px-4 backdrop-blur-xl md:px-8">
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setMenuOpen(true)} aria-label="Open menu">
            <Menu />
          </Button>
          <p className="text-sm font-medium">{current?.label ?? (pathname.includes('/viva') ? 'Viva' : 'Simvaya')}</p>
          <div className="ml-auto flex items-center gap-1">
            <ThemeToggle />
            <UserMenu />
          </div>
        </header>

        <main className="flex-1 px-4 pb-16 md:px-8">
          <div className="mx-auto max-w-6xl py-6 md:py-8">{children}</div>
        </main>
      </div>

      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetContent side="left" className="w-[84vw] bg-background p-5 sm:max-w-xs">
          <SheetHeader className="px-0">
            <SheetTitle className="sr-only">Menu</SheetTitle>
            <Brand href={home} />
          </SheetHeader>
          <div className="mt-6">
            <SideNav items={STUDENT_NAV} pathname={pathname} onNavigate={() => setMenuOpen(false)} />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
