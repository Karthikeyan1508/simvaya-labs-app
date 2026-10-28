'use client';

import { ConversationProvider, useConversation } from '@elevenlabs/react';
import { AudioLines, MessageSquareText, PhoneOff } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { MessageBox } from '@/components/voice/message-box';
import type { ComponentInfo } from '@/lib/types';
import { fetchSignedUrl } from '@/lib/voice-api';
import { createSpeaker, type Speaker } from '@/lib/voice-speaker';
import { firstMessageFor, interviewPrompt, spokenPayload } from '@/lib/viva-oral';
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

  useEffect(() => {
    transcriptEnd.current?.scrollIntoView({ block: 'nearest' });
  }, [lines.length]);

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

  const send = (text: string) => {
    addLine('student', text);
    sendUserMessage(text);
  };

  const live = phase === 'live';
  const connected = status === 'connected';

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

      {live && <MessageBox onSend={send} disabled={!connected} />}

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
