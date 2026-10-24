'use client';

import { ConversationProvider, useConversation } from '@elevenlabs/react';
import { AudioLines, Mic, PhoneOff } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import type { ComponentInfo } from '@/lib/types';
import { fetchSignedUrl } from '@/lib/voice-api';
import { firstMessageFor, interviewPrompt, spokenPayload } from '@/lib/viva-oral';
import { errorMessage, saveSpokenAnswer, saveTranscript, submitViva, type StudentQuestion, type TranscriptLine } from '@/lib/viva';
import { cn } from '@/lib/utils';

// Oral viva. The examiner asks each question by voice, the student answers by voice, and the answers are saved as
// they are spoken. There is no typed answer. The whole conversation is kept as a transcript with the attempt.
export function OralInterview({
  vivaId,
  title,
  questions,
  parts,
  onDone,
}: {
  vivaId: number;
  title: string;
  questions: StudentQuestion[];
  parts: ComponentInfo[];
  onDone: () => void;
}) {
  return (
    <ConversationProvider>
      <Interview vivaId={vivaId} title={title} questions={questions} parts={parts} onDone={onDone} />
    </ConversationProvider>
  );
}

function Interview({ vivaId, title, questions, parts, onDone }: Parameters<typeof OralInterview>[0]) {
  const [phase, setPhase] = useState<'ready' | 'connecting' | 'live' | 'saving' | 'done' | 'error'>('ready');
  const [lines, setLines] = useState<TranscriptLine[]>([]);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const linesRef = useRef<TranscriptLine[]>([]);
  const finished = useRef(false);
  const transcriptEnd = useRef<HTMLLIElement>(null);

  // finish is read through a ref, because the conversation callbacks are fixed when the session starts.
  const finishRef = useRef<() => Promise<void>>(async () => undefined);

  const { startSession, endSession, status, mode } = useConversation({
    onMessage: ({ message, role }) => {
      const line: TranscriptLine = {
        role: role === 'user' ? 'student' : 'examiner',
        text: message,
        at: new Date().toISOString(),
      };
      linesRef.current = [...linesRef.current, line];
      setLines(linesRef.current);
    },
    onDisconnect: () => {
      // The call dropped or the agent ended it: save what was said and submit, unless we already did.
      if (!finished.current) void finishRef.current();
    },
    onError: (message) => {
      setError(`The interview stopped${message ? `: ${message}` : '.'}`);
    },
  });

  useEffect(() => {
    transcriptEnd.current?.scrollIntoView({ block: 'nearest' });
  }, [lines.length]);

  const finish = async () => {
    if (finished.current) return;
    finished.current = true;
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
    setPhase('connecting');
    finished.current = false;
    linesRef.current = [];
    setLines([]);
    try {
      const signedUrl = await fetchSignedUrl();
      await startSession({
        signedUrl,
        connectionType: 'websocket',
        overrides: {
          agent: {
            firstMessage: firstMessageFor(title, questions.length),
            prompt: { prompt: interviewPrompt(title, questions, parts) },
          },
        },
        clientTools: {
          save_viva_answer: async (args: Record<string, unknown>) => {
            try {
              const res = await saveSpokenAnswer(vivaId, spokenPayload(args));
              setNotice(res.message);
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

  const live = phase === 'live';
  const speaking = live && mode === 'speaking';
  const connected = status === 'connected';

  return (
    <div className="space-y-5">
      <div className="glass flex flex-wrap items-center justify-between gap-3 rounded-lg p-4">
        <div className="flex items-center gap-3">
          {speaking ? (
            <AudioLines className="size-5 text-primary" />
          ) : (
            <span className={cn('size-2.5 rounded-full', live && connected ? 'led bg-primary' : 'bg-muted-foreground/40')} />
          )}
          <p className="text-sm">
            {phase === 'ready' && 'Ready when you are. The examiner will speak first.'}
            {phase === 'connecting' && 'Connecting to the examiner…'}
            {live && (speaking ? 'The examiner is speaking' : 'Listening. Answer out loud.')}
            {phase === 'saving' && 'Saving your interview…'}
            {phase === 'done' && 'Interview submitted.'}
            {phase === 'error' && 'The interview is not running.'}
          </p>
        </div>
        {phase === 'ready' && (
          <Button onClick={start}>
            <Mic /> Start the interview
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

      <section className="glass rounded-lg p-4 md:p-5">
        <h2 className="mb-3 text-sm font-medium">Transcript</h2>
        {lines.length === 0 ? (
          <p className="text-sm text-muted-foreground">The conversation appears here as you speak.</p>
        ) : (
          <ol className="max-h-[420px] space-y-3 overflow-y-auto pr-1">
            {lines.map((l, i) => (
              <li key={`${l.at}-${i}`} ref={i === lines.length - 1 ? transcriptEnd : undefined} className="text-sm leading-relaxed">
                <span className={cn('mr-2 text-xs font-medium', l.role === 'examiner' ? 'text-primary' : 'text-muted-foreground')}>
                  {l.role === 'examiner' ? 'Examiner' : 'You'}
                </span>
                {l.text}
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
