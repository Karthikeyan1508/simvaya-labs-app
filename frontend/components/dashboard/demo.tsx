'use client';

import { ArrowUpRight } from 'lucide-react';
import Link from 'next/link';
import { PageHeader } from '@/components/app/page-header';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { buttonVariants } from '@/components/ui/button';
import { DEMO } from './demo-catalog';

export function DemoLabs() {
  return (
    <div className="space-y-10">
      <PageHeader
        title="Demo"
        description="A sample experiment from each of five disciplines. Only the Pelton wheel turbine runs today."
      />

      <Accordion multiple defaultValue={['Mechanical']} className="space-y-3">
        {DEMO.map((d) => {
          const Icon = d.icon;
          const e = d.experiment;
          return (
            <AccordionItem key={d.name} value={d.name} className="overflow-hidden rounded-2xl border border-border/60 bg-card">
              <AccordionTrigger>
                <span className="flex min-w-0 items-center gap-4">
                  <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-[linear-gradient(135deg,#fef3c7_0%,#fcd34d_100%)] text-primary-foreground">
                    <Icon className="size-5" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-base font-semibold tracking-tight">{d.name}</span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">
                      1 experiment · {e.href ? '1 live' : '0 live'}
                    </span>
                  </span>
                </span>
              </AccordionTrigger>

              <AccordionContent>
                <div className="flex items-center gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{e.title}</p>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{e.summary}</p>
                  </div>
                  {e.href ? (
                    <Link href={e.href} className={buttonVariants({ size: 'sm' })}>
                      Open <ArrowUpRight className="size-3.5" />
                    </Link>
                  ) : (
                    <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground">
                      <span className="size-1.5 rounded-full bg-muted-foreground/50" />
                      Coming soon
                    </span>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
    </div>
  );
}
