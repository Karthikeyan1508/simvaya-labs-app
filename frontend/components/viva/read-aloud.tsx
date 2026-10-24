'use client';

import { Volume2, VolumeX } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';

// Reads the question with the browser's speech synthesis. Browsers without it get a note instead of a button.
export function ReadAloud({ text }: { text: string }) {
  const [supported, setSupported] = useState(false);
  const [speaking, setSpeaking] = useState(false);

  useEffect(() => {
    setSupported('speechSynthesis' in window && 'SpeechSynthesisUtterance' in window);
    return () => window.speechSynthesis?.cancel();
  }, []);

  // A new question should not keep talking over the previous one.
  useEffect(() => {
    window.speechSynthesis?.cancel();
    setSpeaking(false);
  }, [text]);

  if (!supported) {
    return <p className="text-xs text-muted-foreground">Read aloud is not available in this browser.</p>;
  }

  const toggle = () => {
    const synth = window.speechSynthesis;
    if (speaking) {
      synth.cancel();
      setSpeaking(false);
      return;
    }
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    synth.speak(utterance);
    setSpeaking(true);
  };

  return (
    <Button type="button" variant="outline" size="sm" onClick={toggle}>
      {speaking ? <VolumeX /> : <Volume2 />}
      {speaking ? 'Stop reading' : 'Read question aloud'}
    </Button>
  );
}
