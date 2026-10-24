'use client';

import type { SectionDef } from '@/lib/sections';
import { cn } from '@/lib/utils';

export interface SectionNavProps<T extends string> {
  sections: readonly SectionDef<T>[];
  active: T;
  onSelect: (id: T) => void;
  badges: Partial<Record<T, string>>;
}

// Boxed section list. Shared by the desktop sidebar and the mobile drawer.
export function SectionNav<T extends string>({ sections, active, onSelect, badges }: SectionNavProps<T>) {
  return (
    <nav aria-label="Experiment sections" className="flex flex-col gap-1">
      {sections.map((s) => {
        const Icon = s.icon;
        const on = s.id === active;
        return (
          <button
            key={s.id}
            type="button"
            onClick={() => onSelect(s.id)}
            aria-current={on ? 'page' : undefined}
            className={cn(
              'group relative flex items-center gap-3 rounded-lg px-2.5 py-2 text-left transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary/45',
              on ? 'bg-primary/10' : 'hover:bg-foreground/[0.04]',
            )}
          >
            {on && <span className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-primary" />}
            <span
              className={cn(
                'grid size-8 shrink-0 place-items-center rounded-md transition-colors',
                on
                  ? 'orange-gradient text-primary-foreground shadow-[0_6px_16px_-8px_rgb(217_119_6/0.8)]'
                  : 'bg-foreground/[0.05] text-muted-foreground group-hover:text-foreground',
              )}
            >
              <Icon className="size-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center justify-between gap-2">
                <span className={cn('text-sm font-medium', on ? 'text-foreground' : 'text-foreground/85')}>
                  {s.label}
                </span>
                {badges[s.id] && <span className="num text-[11px] text-muted-foreground">{badges[s.id]}</span>}
              </span>
              <span className="block truncate text-xs text-muted-foreground">{s.hint}</span>
            </span>
          </button>
        );
      })}
    </nav>
  );
}

// Desktop: a fixed column on the left. Below the lg breakpoint the mobile drawer takes over.
export function Sidebar<T extends string>(props: SectionNavProps<T>) {
  return (
    <aside className="glass hidden w-60 shrink-0 overflow-y-auto rounded-lg p-2 lg:block">
      <SectionNav {...props} />
    </aside>
  );
}
