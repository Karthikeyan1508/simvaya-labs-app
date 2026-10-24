'use client';

import { ConversationProvider, useConversation } from '@elevenlabs/react';
import { AlertTriangle, AudioLines, Mic, PhoneOff, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ApiError } from '@/lib/account';
import { cn } from '@/lib/utils';
import { fetchSignedUrl } from '@/lib/voice-api';
import { partsMentioned } from '@/lib/voice-parts';
import type { VoiceLabBridge, VoiceToolFactory, VoiceTools } from '@/lib/voice-lab';

type Line = { id: number; role: 'user' | 'agent'; text: string };
type State = 'connecting' | 'listening' | 'speaking' | 'error' | 'ended';

const LABEL: Record<State, string> = {
  connecting: 'Connecting',
  listening: 'Listening',
  speaking: 'Speaking',
  error: 'Not connected',
  ended: 'Conversation ended',
};

function startErrorText(e: unknown): string {
  if (e instanceof ApiError && e.status === 503)
    return 'The voice assistant is not set up on this server. ELEVENLABS_API_KEY and ELEVENLABS_AGENT_ID are missing.';
  if (e instanceof ApiError && e.status === 401) return 'Sign in to use the assistant.';
  return `Could not reach the assistant. ${e instanceof Error ? e.message : ''}`.trim();
}

function sessionErrorText(message: string | undefined): string {
  if (message && /permission|notallowed|denied|dismiss/i.test(message))
    return 'Microphone access is blocked. Allow the microphone for this site in your browser settings, then try again.';
  return `The conversation stopped${message ? `: ${message}` : '.'}`;
}

function Indicator({ state }: { state: State }) {
  if (state === 'speaking') return <AudioLines className="size-4 text-primary" />;
  return (
    <span
      className={cn(
        'size-2 rounded-full',
        state === 'listening' && 'led bg-primary',
        state === 'connecting' && 'animate-pulse bg-primary/60',
        (state === 'error' || state === 'ended') && 'bg-muted-foreground/40',
      )}
    />
  );
}

// The assistant floats over a lab. Its tools change the lab state through the lab's bridge. Each lab passes its own
// tool factory (a module-level function, so the tools are built once).
export function VoiceAssistant<L extends VoiceLabBridge>({ lab, tools }: { lab: L; tools: VoiceToolFactory<L> }) {
  return (
    <ConversationProvider>
      <AssistantPanel lab={lab} makeTools={tools} />
    </ConversationProvider>
  );
}

function AssistantPanel<L extends VoiceLabBridge>({ lab, makeTools }: { lab: L; makeTools: VoiceToolFactory<L> }) {
  const latest = useRef(lab);
  latest.current = lab;
  const tools = useMemo<VoiceTools>(() => makeTools(() => latest.current), [makeTools]);

  const [open, setOpen] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const [lines, setLines] = useState<Line[]>([]);
  const lineId = useRef(0);
  // Bumped on every start and end, so a signed URL that arrives after End is ignored.
  const attempt = useRef(0);

  const { startSession, endSession, status, message, mode } = useConversation({
    onMessage: ({ message: text, role }) => {
      const id = ++lineId.current;
      setLines((prev) => [...prev.slice(-5), { id, role, text }]);
      // What the assistant names is lit on the rig, even when the model does not call the highlight tool.
      if (role === 'agent') {
        const ids = partsMentioned(latest.current.parts, text);
        if (ids.length) latest.current.setVoiceHighlight(ids);
      }
    },
  });

  // Dev only: lets a developer drive the tools from the browser console, e.g. simvayaVoiceTools.explode_model({ amount: 1 }).
  useEffect(() => {
    if (process.env.NODE_ENV === 'production') return;
    const w = window as Window & { simvayaVoiceTools?: VoiceTools };
    w.simvayaVoiceTools = tools;
    return () => {
      delete w.simvayaVoiceTools;
    };
  }, [tools]);

  const live = fetching || status === 'connecting' || status === 'connected';
  const state: State =
    fetching || status === 'connecting'
      ? 'connecting'
      : status === 'connected'
        ? mode
        : status === 'error' || startError
          ? 'error'
          : 'ended';
  const errorText = startError ?? (status === 'error' && !fetching ? sessionErrorText(message) : null);

  const start = async () => {
    const id = ++attempt.current;
    const { prompt, firstMessage } = latest.current;
    if (!prompt) return;
    setStartError(null);
    setLines([]);
    setOpen(true);
    setFetching(true);
    try {
      const signedUrl = await fetchSignedUrl();
      if (id !== attempt.current) return;
      setFetching(false);
      startSession({
        signedUrl,
        connectionType: 'websocket',
        overrides: { agent: { firstMessage, prompt: { prompt } } },
        clientTools: tools,
      });
    } catch (e) {
      if (id !== attempt.current) return;
      setFetching(false);
      setStartError(startErrorText(e));
    }
  };

  const end = () => {
    attempt.current++;
    setFetching(false);
    endSession();
    latest.current.setVoiceHighlight(null);
    setOpen(false);
  };

  const onButton = () => {
    if (live) setOpen((o) => !o);
    else void start();
  };

  return (
    <div className="fixed bottom-4 left-4 z-50 flex flex-col items-start gap-2">
      {open && (
        <section aria-label="Lab assistant" className="glass w-[min(22rem,calc(100vw-2rem))] rounded-lg p-4">
          <header className="flex items-center gap-2">
            <Indicator state={state} />
            <span className="text-sm font-medium">{LABEL[state]}</span>
            <Button size="icon-sm" variant="ghost" className="ml-auto" aria-label="Close assistant" onClick={() => setOpen(false)}>
              <X />
            </Button>
          </header>

          {errorText && (
            <p role="alert" className="mt-3 flex gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              <AlertTriangle className="size-4 shrink-0" />
              {errorText}
            </p>
          )}

          <div aria-live="polite" className="mt-3 max-h-60 space-y-2 overflow-y-auto text-sm">
            {lines.map((l) => (
              <p key={l.id} className={cn(l.role === 'agent' ? 'text-foreground' : 'text-muted-foreground')}>
                <span className="font-medium">{l.role === 'agent' ? 'Assistant' : 'You'}: </span>
                {l.text}
              </p>
            ))}
          </div>

          {live && (
            <footer className="mt-4 flex justify-end">
              <Button variant="outline" size="sm" onClick={end}>
                <PhoneOff />
                End
              </Button>
            </footer>
          )}
        </section>
      )}

      <Button onClick={onButton} disabled={!live && !lab.prompt} aria-expanded={open} className="shadow-lg">
        <Mic />
        {live ? (open ? 'Hide assistant' : 'Show assistant') : 'Ask the assistant'}
      </Button>
    </div>
  );
}
