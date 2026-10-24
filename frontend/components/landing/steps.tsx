'use client';

import { animate, stagger, utils } from 'animejs';
import { useLayoutEffect, useRef } from 'react';
import { playWhenVisible, reducedMotion, scrubWithScroll } from './motion';

const STEPS = [
  {
    n: '01',
    title: 'Set the rig',
    body: 'Open the nozzle, start the pump and set the dead weights. The rig reacts as you change each one.',
  },
  {
    n: '02',
    title: 'Record the reading',
    body: 'Record a row once the rig settles. Readings are saved to your account, and a sweep runs twelve loads at once.',
  },
  {
    n: '03',
    title: 'Read the result',
    body: 'Efficiency against brake power, the best load, and every formula with its numbers shown.',
  },
];

// A line that draws itself as you scroll through the section, with each step arriving in turn.
export function Steps() {
  const root = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    if (!root.current || reducedMotion()) return;
    const line = root.current.querySelector<SVGPathElement>('.steps-line');
    const steps = root.current.querySelectorAll('.step');
    if (!line || !steps.length) return;

    // The path has pathLength 1, so a dash offset of (1 - p) draws the fraction p.
    utils.set(line, { strokeDasharray: '1', strokeDashoffset: '1' });
    utils.set(steps, { opacity: 0, y: 32 });

    let reveal: ReturnType<typeof animate> | undefined;
    const stopScrub = scrubWithScroll(root.current, (p) => {
      utils.set(line, { strokeDashoffset: String(1 - p) });
    });
    const stopReveal = playWhenVisible(steps[0], () => {
      reveal = animate(steps, {
        opacity: [0, 1],
        y: [32, 0],
        delay: stagger(160),
        duration: 900,
        ease: 'out(4)',
      });
    });
    return () => {
      stopScrub();
      stopReveal();
      reveal?.cancel();
    };
  }, []);

  return (
    <section ref={root} id="how" className="mx-auto max-w-7xl scroll-mt-28 px-5 py-32 md:px-10">
      <div className="grid gap-16 lg:grid-cols-[1fr_1.2fr] lg:gap-24">
        <div>
          <p className="text-sm font-medium text-primary">How it works</p>
          <h2 className="mt-4 text-5xl leading-[0.95] font-semibold tracking-[-0.035em] md:text-7xl">
            Three steps, <span className="text-gradient-orange">like the bench.</span>
          </h2>
          <p className="mt-6 max-w-md text-lg leading-relaxed text-muted-foreground">
            The same order your lab sheet uses, with the same readings. Scroll and watch the line follow along.
          </p>
        </div>

        <ol className="relative space-y-16 pl-14">
          <svg
            aria-hidden
            className="absolute top-2 left-3 h-[calc(100%-1rem)] w-6 overflow-visible"
            viewBox="0 0 24 100"
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient id="steps-grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#fcd34d" />
                <stop offset="100%" stopColor="#d97706" />
              </linearGradient>
            </defs>
            <path
              className="steps-line"
              d="M 12 0 L 12 100"
              pathLength="1"
              fill="none"
              stroke="url(#steps-grad)"
              strokeWidth="2"
              vectorEffect="non-scaling-stroke"
            />
          </svg>

          {STEPS.map((s) => (
            <li key={s.n} className="step">
              <span className="num block text-sm text-primary">{s.n}</span>
              <h3 className="mt-2 text-3xl leading-tight font-semibold tracking-tight md:text-4xl">{s.title}</h3>
              <p className="mt-3 max-w-lg text-[17px] leading-relaxed text-muted-foreground">{s.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
