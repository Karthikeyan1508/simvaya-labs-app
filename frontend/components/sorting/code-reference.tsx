'use client';

import { Check, ChevronDown, Copy } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { APPROACHES, LANGUAGES, MAIN_CODE, type LanguageId } from './code-samples';
import { splitLines, TOKEN_CLASS, tokenize } from './highlight';

type Mode = 'program' | 'approaches';

// Read-only code. Students read it here; nothing is typed or run in the browser.
export function CodeReference() {
  const [mode, setMode] = useState<Mode>('program');
  const [language, setLanguage] = useState<LanguageId>('python');
  const [approachId, setApproachId] = useState(APPROACHES[0].id);

  const approach = APPROACHES.find((a) => a.id === approachId) ?? APPROACHES[0];
  const file = LANGUAGES.find((l) => l.id === language)?.file ?? '';

  return (
    <Card className="glass min-h-0 flex-1 gap-0 overflow-hidden py-0 ring-0">
      <CardHeader className="border-b py-4">
        <CardTitle className="text-base">Code</CardTitle>
        <CardDescription>Read the program, or compare the ways to choose the pivot.</CardDescription>
      </CardHeader>

      <CardContent className="flex min-h-0 flex-1 flex-col gap-4 py-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Tabs value={mode} onValueChange={(v) => setMode(v as Mode)}>
            <TabsList>
              <TabsTrigger value="program">Program</TabsTrigger>
              <TabsTrigger value="approaches">Approaches</TabsTrigger>
            </TabsList>
          </Tabs>

          {mode === 'program' ? (
            <ChoiceMenu
              label="Language"
              value={language}
              options={LANGUAGES.map((l) => ({ id: l.id, label: l.label }))}
              onChange={setLanguage}
            />
          ) : (
            <ChoiceMenu
              label="Approach"
              value={approach.id}
              options={APPROACHES.map((a) => ({ id: a.id, label: a.name }))}
              onChange={setApproachId}
            />
          )}
        </div>

        {mode === 'program' ? (
          <div className="flex min-h-0 flex-1 flex-col gap-3">
            <div className="flex items-center justify-between gap-2">
              <p className="num min-w-0 truncate text-xs text-muted-foreground">
                {file} · quick sort with the Lomuto partition
              </p>
              <CopyButton text={MAIN_CODE[language]} />
            </div>
            <CodeBlock code={MAIN_CODE[language]} language={language} />
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col gap-4">
            <dl className="space-y-3 text-sm">
              <Detail label="The idea" text={approach.idea} />
              <Detail label="Pivot" text={approach.pivot} />
              <Detail label="Speed" text={approach.time} />
              <Detail label="When to use it" text={approach.whenToUse} />
            </dl>
            <div className="flex items-center justify-between gap-2">
              <p className="num min-w-0 truncate text-xs text-muted-foreground">Pseudocode · {approach.name}</p>
              <CopyButton text={approach.pseudocode} />
            </div>
            <CodeBlock code={approach.pseudocode} language="pseudocode" />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// A dropdown that picks one value, used for the language and the approach.
function ChoiceMenu<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { id: T; label: string }[];
  onChange: (v: T) => void;
}) {
  const current = options.find((o) => o.id === value)?.label;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="inline-flex h-9 items-center gap-2 rounded-lg border border-border/70 bg-card px-3 text-sm shadow-sm outline-none transition-colors hover:border-foreground/20 focus-visible:ring-2 focus-visible:ring-primary/45 aria-expanded:border-primary/50 [&>svg]:transition-transform [&[aria-expanded=true]>svg]:rotate-180">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">{current}</span>
        <ChevronDown className="size-3.5 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuRadioGroup value={value} onValueChange={(v) => onChange(v as T)}>
          {options.map((o) => (
            <DropdownMenuRadioItem key={o.id} value={o.id}>
              {o.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function Detail({ label, text }: { label: string; text: string }) {
  return (
    <div>
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="mt-1 leading-relaxed">{text}</dd>
    </div>
  );
}

// The Clipboard API can refuse (for example when the page is not focused). The hidden text box is the fallback.
async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand('copy');
    area.remove();
    return ok;
  }
}

// Copies the whole code, then says Copied for a moment.
function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const id = window.setTimeout(() => setCopied(false), 1500);
    return () => window.clearTimeout(id);
  }, [copied]);

  const copy = async () => {
    setCopied(await copyText(text));
  };

  return (
    <button
      type="button"
      onClick={copy}
      aria-label="Copy code"
      className="inline-flex h-7 shrink-0 items-center gap-1.5 rounded-md border border-border/70 bg-card px-2.5 text-xs font-medium text-muted-foreground shadow-sm transition-colors hover:border-foreground/20 hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary/45 outline-none"
    >
      {copied ? <Check className="size-3.5 text-primary" /> : <Copy className="size-3.5" />}
      {copied ? 'Copied' : 'Copy'}
    </button>
  );
}

// Code with line numbers and syntax colours. Long lines wrap. The text is shown as written, so it can be selected and copied.
function CodeBlock({ code, language }: { code: string; language: LanguageId }) {
  const lines = splitLines(tokenize(code.replace(/\n$/, ''), language));
  return (
    <pre className="num max-h-[460px] min-h-0 flex-1 overflow-auto rounded-lg border border-border/60 bg-background py-3 text-[12.5px] leading-relaxed xl:max-h-none">
      <code>
        {lines.map((tokens, n) => (
          <span key={n} className="grid grid-cols-[2.75rem_minmax(0,1fr)] pr-4">
            <span className="pr-3 text-right text-muted-foreground/60 select-none">{n + 1}</span>
            <span className="whitespace-pre-wrap break-words">
              {tokens.length === 0
                ? ' '
                : tokens.map((t, k) => (
                    <span key={k} className={TOKEN_CLASS[t.type]}>
                      {t.text}
                    </span>
                  ))}
            </span>
          </span>
        ))}
      </code>
    </pre>
  );
}
