'use client';

import { Send } from 'lucide-react';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

// Where the student's side goes in. It is the dictation target: it is always highlighted and it takes focus back
// whenever nothing else holds it, so Wispr Flow types here. Hold the Wispr key and talk: the message is sent after
// 3 seconds without a change. Enter sends at once, Escape cancels the pending send. Typing works too.
// `refocusKey` lets a parent pull focus back after it handles a click elsewhere.
const AUTO_SEND_MS = 3000;

export function MessageBox({ onSend, disabled, refocusKey = 0 }: { onSend: (text: string) => void; disabled?: boolean; refocusKey?: number }) {
  const [text, setText] = useState('');
  const [held, setHeld] = useState(false); // Escape: keep the text, do not auto-send it
  const input = useRef<HTMLInputElement>(null);
  const focus = () => input.current?.focus();

  useEffect(focus, [refocusKey, disabled]);
  useEffect(() => {
    window.addEventListener('focus', focus);
    return () => window.removeEventListener('focus', focus);
  }, []);

  const send = () => {
    const t = text.trim();
    if (!t || disabled) return;
    onSend(t);
    setText('');
    setHeld(false);
    focus();
  };
  const submit = (e: FormEvent) => {
    e.preventDefault();
    send();
  };

  // Dictation ends with a pause: send when the text has not changed for AUTO_SEND_MS.
  const pending = !!text.trim() && !disabled && !held;
  useEffect(() => {
    if (!pending) return;
    const id = setTimeout(send, AUTO_SEND_MS);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, pending]);

  return (
    <form onSubmit={submit} className="space-y-1.5">
      <p className="px-1 text-[11px] font-medium tracking-wide text-primary">DICTATION TARGET · hold your Wispr Flow key and speak</p>
      <div className="flex items-center gap-2 rounded-xl border-2 border-primary bg-card p-1.5 shadow-[0_0_0_4px_rgb(217_119_6/0.15)]">
        <Input
          ref={input}
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setHeld(false);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setHeld(true);
          }}
          // Nothing else took focus (a click on empty space): take it back so dictation keeps landing here.
          onBlur={() => setTimeout(() => (!document.activeElement || document.activeElement === document.body) && focus(), 0)}
          placeholder="Speak with Wispr Flow, or type, then Enter"
          aria-label="Your message"
          autoFocus
          autoComplete="off"
          disabled={disabled}
          className="h-10 border-0 bg-transparent shadow-none focus-visible:ring-0"
        />
        <Button type="submit" size="icon-sm" aria-label="Send" disabled={disabled || !text.trim()}>
          <Send />
        </Button>
      </div>
      <div className="h-5 px-1 text-[11px] text-muted-foreground">
        {pending && (
          <>
            <span key={text} className="mb-1 block h-0.5 origin-left bg-primary/60 [animation:autosend_3s_linear_forwards]" />
            Sending in 3 seconds. Enter sends now, Esc cancels.
          </>
        )}
        {held && !!text.trim() && 'Auto-send is off for this message. Press Enter to send.'}
      </div>
    </form>
  );
}
