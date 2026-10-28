import { fetchSpeech } from '@/lib/voice-api';

// Plays the assistant's replies one after another. Only the replies are spoken; the student's side is typed or
// dictated with Wispr Flow. Speech is optional: when it fails, the text is still on screen.
export interface Speaker {
  speak: (text: string) => void;
  stop: () => void;
  setMuted: (muted: boolean) => void;
}

export function createSpeaker(onSpeaking: (speaking: boolean) => void): Speaker {
  let queue: string[] = [];
  let audio: HTMLAudioElement | null = null;
  let playing = false;
  let muted = false;
  let run = 0; // bumped by stop, so audio that arrives late is dropped

  const next = async (): Promise<void> => {
    if (playing) return;
    const text = queue.shift();
    if (!text) {
      onSpeaking(false);
      return;
    }
    playing = true;
    onSpeaking(true);
    const mine = run;
    let url = '';
    try {
      url = URL.createObjectURL(await fetchSpeech(text));
      if (mine !== run) return;
      const a = new Audio(url);
      audio = a;
      await new Promise<void>((done) => {
        a.onended = () => done();
        a.onerror = () => done();
        a.play().catch(() => done());
      });
    } catch {
      /* the reply stays readable */
    } finally {
      if (url) URL.revokeObjectURL(url);
    }
    if (mine !== run) return;
    audio = null;
    playing = false;
    void next();
  };

  return {
    speak(text) {
      const t = text.trim();
      if (!t || muted) return;
      queue.push(t);
      void next();
    },
    stop() {
      run++;
      queue = [];
      audio?.pause();
      audio = null;
      playing = false;
      onSpeaking(false);
    },
    setMuted(m) {
      muted = m;
      if (m) this.stop();
    },
  };
}
