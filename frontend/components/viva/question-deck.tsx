'use client';

import { ArrowDown, ArrowUp, Check, ChevronDown, Pencil, Plus, Trash2, Undo2 } from 'lucide-react';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import type { ComponentInfo, ProcedureStep } from '@/lib/types';
import { cn } from '@/lib/utils';
import {
  KIND_LABEL,
  VIVA_KINDS,
  answerKeyText,
  blankQuestion,
  type DraftQuestion,
  type VivaKind,
} from '@/lib/viva';
import { QuestionEditor } from './question-editor';

export interface Row {
  key: string;
  q: DraftQuestion;
  review: 'open' | 'approved' | 'rejected';
}

let seq = 0;
export const toRows = (questions: DraftQuestion[]): Row[] => questions.map((q) => ({ key: `r${++seq}`, q, review: 'open' }));

interface Props {
  rows: Row[];
  onChange: (rows: Row[]) => void;
  parts: ComponentInfo[];
  steps: ProcedureStep[];
  review?: boolean; // approve or reject each row (AI draft)
  locked?: boolean; // read only
}

// The teacher's question list: edit, reorder, delete, add, and approve or reject AI proposals.
export function QuestionDeck({ rows, onChange, parts, steps, review = false, locked = false }: Props) {
  const [editing, setEditing] = useState<string | null>(null);
  const labels = Object.fromEntries(parts.map((p) => [p.id, p.label]));

  const update = (key: string, patch: Partial<Row>) =>
    onChange(rows.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= rows.length) return;
    const next = [...rows];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };
  const remove = (key: string) => {
    onChange(rows.filter((r) => r.key !== key));
    if (editing === key) setEditing(null);
  };
  const add = (kind: VivaKind) => {
    const key = `r${++seq}`;
    onChange([...rows, { key, q: blankQuestion(kind, parts[0]?.id ?? ''), review: 'open' }]);
    setEditing(key);
  };

  return (
    <div className="space-y-3">
      {rows.length === 0 && <p className="text-sm text-muted-foreground">No questions yet. Add one below.</p>}

      <ol className="space-y-3">
        {rows.map((r, i) => {
          const isEditing = editing === r.key;
          return (
            <li key={r.key} className={cn('glass rounded-lg p-4 md:p-5', review && r.review === 'rejected' && 'opacity-50')}>
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span className="num">Q{i + 1}</span>
                <Badge variant="outline" className="rounded-md">
                  {KIND_LABEL[r.q.kind]}
                </Badge>
                <span className="num">
                  {r.q.points} {r.q.points === 1 ? 'mark' : 'marks'}
                </span>
                {review && r.review === 'approved' && <Badge className="rounded-md border-0 bg-primary/15 text-primary">Approved</Badge>}
                {review && r.review === 'rejected' && <Badge variant="secondary" className="rounded-md">Rejected</Badge>}
              </div>

              <p className="mt-2 text-[15px] leading-relaxed whitespace-pre-line">
                {r.q.prompt || <span className="text-muted-foreground">No prompt yet</span>}
              </p>
              {!isEditing && (
                <p className="mt-2 text-sm text-muted-foreground">
                  <span className="font-medium text-foreground/80">Answer key:</span> {answerKeyText(r.q, labels)}
                </p>
              )}

              {!locked && !isEditing && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  <Button variant="outline" size="sm" onClick={() => setEditing(r.key)}>
                    <Pencil /> Edit
                  </Button>
                  {review && r.review !== 'rejected' && (
                    <Button
                      variant={r.review === 'approved' ? 'secondary' : 'outline'}
                      size="sm"
                      onClick={() => update(r.key, { review: r.review === 'approved' ? 'open' : 'approved' })}
                    >
                      <Check /> {r.review === 'approved' ? 'Unapprove' : 'Approve'}
                    </Button>
                  )}
                  {review && r.review !== 'rejected' && (
                    <Button variant="outline" size="sm" onClick={() => update(r.key, { review: 'rejected' })}>
                      Reject
                    </Button>
                  )}
                  {review && r.review === 'rejected' && (
                    <Button variant="outline" size="sm" onClick={() => update(r.key, { review: 'open' })}>
                      <Undo2 /> Restore
                    </Button>
                  )}
                  <Button variant="ghost" size="icon-sm" aria-label={`Move Q${i + 1} up`} disabled={i === 0} onClick={() => move(i, -1)}>
                    <ArrowUp />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Move Q${i + 1} down`}
                    disabled={i === rows.length - 1}
                    onClick={() => move(i, 1)}
                  >
                    <ArrowDown />
                  </Button>
                  <Button variant="ghost" size="icon-sm" aria-label={`Delete Q${i + 1}`} onClick={() => remove(r.key)}>
                    <Trash2 />
                  </Button>
                </div>
              )}

              {isEditing && (
                <div className="mt-4 space-y-4 border-t pt-4">
                  <QuestionEditor q={r.q} onChange={(q) => update(r.key, { q })} parts={parts} steps={steps} />
                  <div className="flex justify-end">
                    <Button size="sm" onClick={() => setEditing(null)}>
                      <Check /> Done
                    </Button>
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ol>

      {!locked && (
        <DropdownMenu>
          <DropdownMenuTrigger className={buttonVariants({ variant: 'outline', size: 'sm' })}>
            <Plus /> Add question <ChevronDown />
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-60">
            {VIVA_KINDS.map((k) => (
              <DropdownMenuItem key={k} onClick={() => add(k)}>
                {KIND_LABEL[k]}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}
