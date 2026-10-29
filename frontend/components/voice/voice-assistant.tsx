'use client';

import { ConversationProvider, useConversation } from '@elevenlabs/react';
import { AlertTriangle, AudioLines, MessageSquareText, PhoneOff, Volume2, VolumeX, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ChatLog } from '@/components/voice/chat';
import { MessageBox } from '@/components/voice/message-box';
import { ApiError } from '@/lib/account';
import { cn } from '@/lib/utils';
import { fetchSignedUrl } from '@/lib/voice-api';
import { createSpeaker, type Speaker } from '@/lib/voice-speaker';
import { cleanReply, partsMentioned } from '@/lib/voice-parts';
import type { VoiceLabBridge, VoiceToolFactory, VoiceTools } from '@/lib/voice-lab';

type Line = { id: number; role: 'user' | 'agent'; text: string };
type State = 'connecting' | 'listening' | 'speaking' | 'error' | 'ended';

const LABEL: Record<State, string> = {
  connecting: 'Connecting',
  listening: 'Ready for your message',
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

  // The student writes (typed, or dictated with Wispr Flow) and only the assistant's replies are spoken.
  const [speaking, setSpeaking] = useState(false);
  const [muted, setMuted] = useState(false);
  const speaker = useRef<Speaker | null>(null);
  if (!speaker.current) speaker.current = createSpeaker(setSpeaking);

  const addLine = (role: Line['role'], text: string) => {
    const id = ++lineId.current;
    setLines((prev) => [...prev.slice(-5), { id, role, text }]);
  };

  const { startSession, endSession, sendUserMessage, status, message } = useConversation({
    onMessage: ({ message: text, role }) => {
      // The student's own lines are added when they are sent, so only the assistant is handled here.
      if (role !== 'agent') return;
      const reply = cleanReply(text);
      if (!reply) return;
      addLine('agent', reply);
      speaker.current?.speak(reply);
      // What the assistant names is lit on the rig, even when the model does not call the highlight tool.
      const ids = partsMentioned(latest.current.parts, text);
      if (ids.length) latest.current.setVoiceHighlight(ids);
    },
  });

  const send = (text: string) => {
    addLine('user', text);
    sendUserMessage(text);
  };

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
        ? speaking
          ? 'speaking'
          : 'listening'
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
        textOnly: true, // no microphone: the replies are spoken by the app instead
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
    speaker.current?.stop();
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
            <Button
              size="icon-sm"
              variant="ghost"
              className="ml-auto"
              aria-label={muted ? 'Turn spoken replies on' : 'Turn spoken replies off'}
              aria-pressed={muted}
              onClick={() => {
                speaker.current?.setMuted(!muted);
                setMuted(!muted);
              }}
            >
              {muted ? <VolumeX /> : <Volume2 />}
            </Button>
            <Button size="icon-sm" variant="ghost" aria-label="Close assistant" onClick={() => setOpen(false)}>
              <X />
            </Button>
          </header>

          {errorText && (
            <p role="alert" className="mt-3 flex gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              <AlertTriangle className="size-4 shrink-0" />
              {errorText}
            </p>
          )}

          <ChatLog
            messages={lines.map((l) => ({
              id: l.id,
              from: l.role === 'agent' ? 'them' : 'you',
              name: l.role === 'agent' ? 'Assistant' : 'You',
              text: l.text,
            }))}
            empty="Say hello to the assistant."
            className="mt-3 max-h-64 rounded-md bg-muted/30"
          />

          {status === 'connected' && (
            <div className="mt-3">
              <MessageBox onSend={send} />
            </div>
          )}

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
        <MessageSquareText />
        {live ? (open ? 'Hide assistant' : 'Show assistant') : 'Ask the assistant'}
      </Button>
    </div>
  );
}
