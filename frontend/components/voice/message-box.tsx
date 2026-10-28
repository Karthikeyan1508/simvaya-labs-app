'use client';

import { Send } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

// Where the student's side goes in. Hold the Wispr Flow key and talk with this field focused, then press Enter.
// Typing works too. Only the reply is spoken back.
export function MessageBox({ onSend, disabled, autoFocus = true }: { onSend: (text: string) => void; disabled?: boolean; autoFocus?: boolean }) {
  const [text, setText] = useState('');

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const t = text.trim();
    if (!t || disabled) return;
    onSend(t);
    setText('');
  };

  return (
    <form onSubmit={submit} className="flex items-center gap-2">
      <Input
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Speak with Wispr Flow, or type, then Enter"
        aria-label="Your message"
        autoFocus={autoFocus}
        autoComplete="off"
        disabled={disabled}
        className="h-9"
      />
      <Button type="submit" size="icon-sm" aria-label="Send" disabled={disabled || !text.trim()}>
        <Send />
      </Button>
    </form>
  );
}
