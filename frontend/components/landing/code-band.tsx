'use client';

import { animate, stagger, utils } from 'animejs';
import { useLayoutEffect, useRef } from 'react';
import { playWhenVisible, reducedMotion } from './motion';

// The formulas are in the product as code, so the page shows the same lines.
const LINES = [
  { text: '// Brake power from the speed and the brake torque', tone: 'muted' },
  { text: 'const omega = (2 * Math.PI * speedRpm) / 60;   // rad/s', tone: 'code' },
  { text: 'const bhpKw = (torqueNm * omega) / 1000;       // brake power', tone: 'code' },
  { text: '// Efficiency: brake power over input power', tone: 'muted' },
  { text: 'const etaPct = (bhpKw / ipKw) * 100;', tone: 'accent' },
] as const;

export function CodeBand() {
  const root = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    if (!root.current || reducedMotion()) return;
    const lines = root.current.querySelectorAll('.code-line');
    if (!lines.length) return;
    utils.set(lines, { opacity: 0, x: -14 });
    let reveal: ReturnType<typeof animate> | undefined;
    const stop = playWhenVisible(lines[0], () => {
      reveal = animate(lines, {
        opacity: [0, 1],
        x: [-14, 0],
        delay: stagger(140),
        duration: 700,
        ease: 'out(3)',
      });
    });
    return () => {
      stop();
      reveal?.cancel();
    };
  }, []);

  return (
    <section ref={root} className="mx-auto max-w-7xl px-5 py-32 md:px-10">
      <div className="grid items-center gap-12 lg:grid-cols-[1fr_1.1fr] lg:gap-20">
        <div>
          <p className="text-sm font-medium text-primary">Under the hood</p>
          <h2 className="mt-4 text-5xl leading-[0.95] font-semibold tracking-[-0.035em] md:text-6xl">
            The physics is <span className="text-gradient-orange">code you can read.</span>
          </h2>
          <p className="mt-6 max-w-md text-lg leading-relaxed text-muted-foreground">
            No black box. Each number on the dashboard comes from a formula you can open and check.
          </p>
        </div>

        <div className="overflow-hidden rounded-lg border border-border/60 bg-card shadow-[0_30px_80px_-40px_rgb(0_0_0/0.4)]">
          <div className="flex items-center gap-2 border-b border-border/60 px-4 py-3">
            <span className="size-2.5 rounded-full bg-foreground/15" />
            <span className="size-2.5 rounded-full bg-foreground/15" />
            <span className="size-2.5 rounded-full bg-foreground/15" />
            <span className="num ml-3 text-xs text-muted-foreground">pelton-wheel.physics.ts</span>
          </div>
          <pre className="num space-y-2 overflow-x-auto p-6 text-[13px] leading-relaxed md:text-sm">
            {LINES.map((l) => (
              <span
                key={l.text}
                className={`code-line block whitespace-pre ${
                  l.tone === 'muted'
                    ? 'text-muted-foreground'
                    : l.tone === 'accent'
                      ? 'text-gradient-orange font-semibold'
                      : 'text-foreground'
                }`}
              >
                {l.text}
              </span>
            ))}
          </pre>
        </div>
      </div>
    </section>
  );
}
