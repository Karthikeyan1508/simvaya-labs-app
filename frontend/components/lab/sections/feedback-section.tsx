'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { SectionHead } from '../section-head';

const KEY = 'simvaya-feedback';

// Feedback is kept in this browser only until a backend endpoint exists.
export function FeedbackSection() {
  const [rating, setRating] = useState<number | null>(null);
  const [text, setText] = useState('');
  const [status, setStatus] = useState<'idle' | 'saved' | 'failed'>('idle');

  const submit = () => {
    try {
      const list = JSON.parse(window.localStorage.getItem(KEY) ?? '[]') as unknown[];
      list.push({ rating, text, at: new Date().toISOString() });
      window.localStorage.setItem(KEY, JSON.stringify(list));
      setStatus('saved');
      setText('');
      setRating(null);
    } catch {
      setStatus('failed');
    }
  };

  return (
    <div className="space-y-8">
      <SectionHead title="Feedback" subtitle="Tell us what worked and what did not." />

      <div className="max-w-2xl space-y-5">
        <div className="space-y-2">
          <p className="text-sm font-medium">How clear was the experiment?</p>
          <div className="flex gap-1.5">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setRating(n)}
                aria-pressed={rating === n}
                className="btn-chip num size-10 px-0 text-sm"
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="feedback-text" className="text-sm font-medium">
            Comments
          </label>
          <textarea
            id="feedback-text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={6}
            className="w-full resize-y rounded-md border bg-transparent px-3 py-2.5 text-sm outline-none focus-visible:border-primary"
            placeholder="What would make the simulation easier to follow?"
          />
        </div>

        <div className="flex items-center gap-3">
          <Button onClick={submit} disabled={rating === null && text.trim() === ''}>
            Send feedback
          </Button>
          {status === 'saved' && <span className="text-sm text-primary">Saved in this browser. Thank you.</span>}
          {status === 'failed' && <span className="text-sm text-destructive">Could not save in this browser.</span>}
        </div>
      </div>
    </div>
  );
}
