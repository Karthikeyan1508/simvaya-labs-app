'use client';

import { ConversationProvider, useConversation } from '@elevenlabs/react';
import { AudioLines, MessageSquareText, PhoneOff } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ChatLog, type ChatMessage } from '@/components/voice/chat';
import { MessageBox } from '@/components/voice/message-box';
import { VivaRig } from '@/components/viva/viva-rig';
import type { ComponentInfo } from '@/lib/types';
import { fetchSignedUrl } from '@/lib/voice-api';
import { createSpeaker, type Speaker } from '@/lib/voice-speaker';
import { firstMessageFor, interviewPrompt, labToolStandIns, spokenPayload } from '@/lib/viva-oral';
import { errorMessage, saveSpokenAnswer, saveTranscript, submitViva, type StudentQuestion, type TranscriptLine } from '@/lib/viva';
import { cn } from '@/lib/utils';

// Oral viva. The examiner's questions are spoken. The student answers by dictating into the message box with
// Wispr Flow (typing works too), and each answer is saved as it is given. The whole conversation is kept as a
// transcript with the attempt.
export function OralInterview({
  vivaId,
  title,
  questions,
  parts,
  showRig,
  onDone,
}: {
  vivaId: number;
  title: string;
  questions: StudentQuestion[];
  parts: ComponentInfo[];
  showRig?: boolean; // the lab has a 3D model the questions can point at
  onDone: () => void;
}) {
  return (
    <ConversationProvider>
      <Interview vivaId={vivaId} title={title} questions={questions} parts={parts} showRig={showRig} onDone={onDone} />
    </ConversationProvider>
  );
}

function Interview({ vivaId, title, questions, parts, showRig, onDone }: Parameters<typeof OralInterview>[0]) {
  const [phase, setPhase] = useState<'ready' | 'connecting' | 'live' | 'saving' | 'done' | 'error'>('ready');
  const [lines, setLines] = useState<TranscriptLine[]>([]);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  // The highest question number the examiner has saved. The question on screen is the next one.
  const [answered, setAnswered] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [pickedPart, setPickedPart] = useState<string | null>(null);
  const [focusTick, setFocusTick] = useState(0); // bumped after a click on a choice, so the dictation box gets focus back
  const linesRef = useRef<TranscriptLine[]>([]);
  const finished = useRef(false);

  // finish is read through a ref, because the conversation callbacks are fixed when the session starts.
  const finishRef = useRef<() => Promise<void>>(async () => undefined);

  const [speaking, setSpeaking] = useState(false);
  const speaker = useRef<Speaker | null>(null);
  if (!speaker.current) speaker.current = createSpeaker(setSpeaking);

  const addLine = (role: TranscriptLine['role'], text: string) => {
    linesRef.current = [...linesRef.current, { role, text, at: new Date().toISOString() }];
    setLines(linesRef.current);
  };

  const { startSession, endSession, sendUserMessage, status } = useConversation({
    onMessage: ({ message, role }) => {
      // The student's lines are added when they are sent. Only the examiner is handled here, and it is spoken.
      if (role === 'user') return;
      addLine('examiner', message);
      speaker.current?.speak(message);
    },
    onDisconnect: () => {
      // The call dropped or the agent ended it: save what was said and submit, unless we already did.
      if (!finished.current) void finishRef.current();
    },
    onError: (message) => {
      setError(`The interview stopped${message ? `: ${message}` : '.'}`);
    },
  });

  const finish = async () => {
    if (finished.current) return;
    finished.current = true;
    speaker.current?.stop();
    setPhase('saving');
    setError('');
    try {
      try {
        await endSession();
      } catch {
        // The call may already be closed; the transcript and submit still go ahead.
      }
      await saveTranscript(vivaId, linesRef.current);
      await submitViva(vivaId);
      setPhase('done');
      onDone();
    } catch (e) {
      finished.current = false;
      setError(errorMessage(e));
      setPhase('error');
    }
  };
  finishRef.current = finish;

  const start = async () => {
    setError('');
    setNotice('');
    setAnswered(0);
    setPicked(null);
    setPhase('connecting');
    finished.current = false;
    linesRef.current = [];
    setLines([]);
    try {
      const signedUrl = await fetchSignedUrl();
      await startSession({
        signedUrl,
        connectionType: 'websocket',
        textOnly: true, // no microphone: the examiner is spoken by the app, the student's answers are typed or dictated
        overrides: {
          agent: {
            firstMessage: firstMessageFor(title, questions.length),
            prompt: { prompt: interviewPrompt(title, questions, parts) },
          },
        },
        clientTools: {
          ...labToolStandIns(),
          save_viva_answer: async (args: Record<string, unknown>) => {
            try {
              const res = await saveSpokenAnswer(vivaId, spokenPayload(args));
              setNotice(res.message);
              if (res.ok) {
                setAnswered((n) => Math.max(n, Number(args.question_number) || 0));
                setPicked(null);
                setPickedPart(null);
              }
              return res.message;
            } catch {
              return 'I could not save that answer. Please ask the student to repeat it.';
            }
          },
          finish_viva: async () => {
            await finishRef.current();
            return 'The interview is submitted. Thank the student and say goodbye.';
          },
        },
      });
      setPhase('live');
    } catch (e) {
      setError(errorMessage(e));
      setPhase('error');
    }
  };

  const send = (text: string) => {
    addLine('student', text);
    sendUserMessage(text);
  };

  const live = phase === 'live';
  const connected = status === 'connected';
  const current = live ? questions[answered] : undefined;
  const choices = current && (current.kind === 'mcq' || current.kind === 'formula') ? current.options : undefined;

  const chat: ChatMessage[] = lines.map((l, i) => ({
    id: `${l.at}-${i}`,
    from: l.role === 'examiner' ? 'them' : 'you',
    name: l.role === 'examiner' ? 'Examiner' : 'You',
    text: l.text,
    at: l.at,
  }));

  // The model is shown for "name the highlighted part" and "click the part" questions.
  const rigKind = showRig && current && (current.kind === 'highlight' || current.kind === 'point') ? current.kind : undefined;
  const pickPart = (id: string) => {
    setPickedPart(id);
    setFocusTick((n) => n + 1);
    send(`I pick the ${parts.find((p) => p.id === id)?.label ?? id} (part id ${id}).`);
  };

  const choose = (k: number) => {
    setPicked(k);
    setFocusTick((n) => n + 1);
    send(`I choose option ${k}: ${choices?.[k] ?? ''}`);
  };

  return (
    <div className="space-y-5">
      <div className="glass flex flex-wrap items-center justify-between gap-3 rounded-lg p-4">
        <div className="flex items-center gap-3">
          {live && speaking ? (
            <AudioLines className="size-5 text-primary" />
          ) : (
            <span className={cn('size-2.5 rounded-full', live && connected ? 'led bg-primary' : 'bg-muted-foreground/40')} />
          )}
          <p className="text-sm">
            {phase === 'ready' && 'Ready when you are. The examiner will ask the first question aloud.'}
            {phase === 'connecting' && 'Connecting to the examiner…'}
            {live && (speaking ? 'The examiner is speaking' : 'Your turn. Dictate your answer with Wispr Flow, or type it.')}
            {phase === 'saving' && 'Saving your interview…'}
            {phase === 'done' && 'Interview submitted.'}
            {phase === 'error' && 'The interview is not running.'}
          </p>
        </div>
        {phase === 'ready' && (
          <Button onClick={start}>
            <MessageSquareText /> Start the interview
          </Button>
        )}
        {live && (
          <Button
            variant="outline"
            onClick={() => {
              if (window.confirm('End the interview and submit it now? You cannot answer again afterwards.')) void finish();
            }}
          >
            <PhoneOff /> End and submit
          </Button>
        )}
      </div>

      {notice && live && <p className="text-xs text-muted-foreground">Saved: {notice}</p>}
      {error && <p className="text-sm text-destructive">{error}</p>}

      <section
        aria-label="Interview chat"
        className={cn(
          'glass flex flex-col overflow-hidden rounded-lg',
          // The model needs room, so the card grows while it is on screen.
          rigKind ? 'h-[min(94vh,860px)]' : 'h-[min(74vh,700px)]',
        )}
      >
        <ChatLog
          messages={chat}
          empty="The conversation appears here. The examiner speaks first."
          className="min-h-0 flex-1"
        />

        {live && rigKind && (
          <VivaRig
            parts={parts}
            highlight={rigKind === 'highlight' && current?.highlightPartId ? [current.highlightPartId] : []}
            selected={rigKind === 'point' ? pickedPart : null}
            onPick={rigKind === 'point' ? pickPart : undefined}
            caption={rigKind === 'highlight' ? 'Name the part that glows.' : 'Click the part the examiner asks for.'}
          />
        )}

        {live && choices && (
          <div aria-label="Choose an answer" className="space-y-2 border-t border-border/60 bg-muted/30 p-3">
            <p className="text-xs font-medium text-muted-foreground">Question {answered + 1}: choose an answer</p>
            <ul className="grid gap-2 sm:grid-cols-2">
              {choices.map((text, k) => (
                <li key={k}>
                  <Button
                    type="button"
                    variant={picked === k ? 'default' : 'outline'}
                    className="h-auto w-full justify-start whitespace-normal py-2 text-left"
                    disabled={!connected}
                    aria-pressed={picked === k}
                    onClick={() => choose(k)}
                  >
                    <span className="mr-2 font-mono text-xs">{String.fromCharCode(65 + k)}</span>
                    {text}
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Frozen at the bottom of the chat, outside the scrolling log. */}
        <div className="border-t border-border/60 bg-background/80 p-3 backdrop-blur">
          <MessageBox onSend={send} disabled={!live || !connected} refocusKey={focusTick} />
        </div>
      </section>
    </div>
  );
}
