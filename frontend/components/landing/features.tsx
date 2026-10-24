'use client';

import { animate, stagger, utils } from 'animejs';
import { useLayoutEffect, useRef } from 'react';
import { playWhenVisible, reducedMotion } from './motion';

const FEATURES = [
  {
    title: 'Rigs you can take apart',
    body: 'Explode the 3D model, label every part, and move the valves yourself.',
    tags: ['3D', 'EXPLODE', 'LABELS'],
  },
  {
    title: 'Calculations you can follow',
    body: 'Every manual formula, with your numbers substituted in and the graphs drawn from them.',
    tags: ['FORMULAS', 'GRAPHS', 'TABLES'],
  },
  {
    title: 'A guided procedure',
    body: 'Nine steps from the lab sheet. The rig moves to each one as you reach it.',
    tags: ['STEPS', 'PLAYBACK', 'HIGHLIGHTS'],
  },
  {
    title: 'Records that stay',
    body: 'Readings, attempts and activity saved to your account, ready for your viva.',
    tags: ['RECORDINGS', 'ACTIVITY', 'VIVA SOON'],
  },
];

export function Features() {
  const root = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    if (!root.current || reducedMotion()) return;
    const cards = root.current.querySelectorAll('.feature');
    utils.set(cards, { opacity: 0, y: 48 });
    let reveal: ReturnType<typeof animate> | undefined;
    const stop = playWhenVisible(cards[0], () => {
      reveal = animate(cards, {
        opacity: [0, 1],
        y: [48, 0],
        delay: stagger(120),
        duration: 1000,
        ease: 'out(4)',
      });
    });
    return () => {
      stop();
      reveal?.cancel();
    };
  }, []);

  return (
    <section ref={root} id="labs" className="mx-auto max-w-7xl scroll-mt-28 px-5 py-32 md:px-10">
      <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20">
        <div className="lg:sticky lg:top-32 lg:self-start">
          <p className="text-sm font-medium text-primary">Why Simvaya</p>
          <h2 className="mt-4 text-5xl leading-[0.95] font-semibold tracking-[-0.035em] md:text-7xl">
            Built like the workshop, <span className="text-gradient-orange">not a video.</span>
          </h2>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {FEATURES.map((f) => (
            <article
              key={f.title}
              className="feature surface-gradient flex min-h-72 flex-col justify-between rounded-lg border border-border/60 p-8"
            >
              <div className="space-y-3">
                <h3 className="text-2xl leading-tight font-semibold tracking-tight">{f.title}</h3>
                <p className="text-[15px] leading-relaxed text-muted-foreground">{f.body}</p>
              </div>
              <div className="mt-8 flex flex-wrap gap-1.5">
                {f.tags.map((t) => (
                  <span
                    key={t}
                    className="num rounded-md border border-border px-2 py-1 text-[11px] tracking-wide text-muted-foreground"
                  >
                    {t}
                  </span>
                ))}
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
