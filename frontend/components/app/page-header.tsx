import type { ReactNode } from 'react';

// Title block for dashboard pages: optional small line above, a title, a description and actions.
export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-6">
      <div className="space-y-2">
        {eyebrow && <p className="text-sm text-muted-foreground">{eyebrow}</p>}
        <h1 className="text-3xl font-semibold tracking-[-0.025em] md:text-[34px]">{title}</h1>
        {description && <p className="max-w-2xl text-[15px] leading-relaxed text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

// Small heading for a block inside a page.
export function Block({ title, meta, children }: { title: string; meta?: string; children: ReactNode }) {
  return (
    <section className="space-y-5">
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
        {meta && <p className="text-sm text-muted-foreground">{meta}</p>}
      </div>
      {children}
    </section>
  );
}
