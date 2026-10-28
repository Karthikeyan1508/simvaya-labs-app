'use client';

import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

export type ChatMessage = { id: string | number; from: 'them' | 'you'; name: string; text: string; at?: string };

const clock = (iso?: string) => {
  const d = iso ? new Date(iso) : null;
  return d && !Number.isNaN(d.getTime()) ? d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' }) : '';
};

// The conversation. The other side (examiner or assistant) sits on the left in a bordered card with an amber marker,
// the student sits on the right in a soft amber-tinted bubble, so the two are told apart at a glance. It scrolls by itself.
export function ChatLog({ messages, empty, className }: { messages: ChatMessage[]; empty: string; className?: string }) {
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = box.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length]);

  return (
    <div ref={box} aria-live="polite" className={cn('flex flex-col gap-4 overflow-y-auto p-4', className)}>
      {messages.length === 0 && <p className="m-auto max-w-xs text-center text-sm text-muted-foreground">{empty}</p>}
      {messages.map((m) => {
        const mine = m.from === 'you';
        const at = clock(m.at);
        return (
          <div key={m.id} className={cn('flex max-w-[88%] flex-col gap-1', mine ? 'items-end self-end' : 'items-start self-start')}>
            <span className="flex items-center gap-1.5 text-[11px] font-medium tracking-wide text-muted-foreground">
              <span className={cn('size-1.5 rounded-full', mine ? 'bg-foreground/50' : 'bg-primary')} />
              {m.name}
              {at && <span className="font-normal opacity-70">· {at}</span>}
            </span>
            <p
              className={cn(
                'whitespace-pre-wrap px-4 py-2.5 text-sm leading-relaxed',
                mine
                  ? 'rounded-2xl rounded-tr-sm border border-primary/25 bg-accent text-accent-foreground'
                  : 'rounded-2xl rounded-tl-sm border border-border bg-card text-card-foreground shadow-sm',
              )}
            >
              {m.text}
            </p>
          </div>
        );
      })}
    </div>
  );
}
