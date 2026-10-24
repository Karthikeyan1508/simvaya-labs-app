import type { ReactNode } from 'react';

// Page header for each section: title, one line of context, optional actions on the right.
export function SectionHead({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4 border-b pb-6">
      <div className="space-y-2">
        <h2 className="text-[28px] leading-tight font-semibold tracking-[-0.02em] md:text-[32px]">{title}</h2>
        {subtitle && <p className="max-w-2xl text-[15px] text-muted-foreground">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
