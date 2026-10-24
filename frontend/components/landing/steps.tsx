'use client';

import { utils } from 'animejs';
import { useLayoutEffect, useRef } from 'react';
import { reducedMotion, scrubWithScroll } from './motion';

const STEPS = [
  {
    n: '01',
    title: 'Pick a lab',
    body: 'Choose one of the four labs. Each one opens with its setup, theory and procedure.',
  },
  {
    n: '02',
    title: 'Run and measure',
    body: 'Change the inputs and take readings. Each reading is saved to your account.',
  },
  {
    n: '03',
    title: 'Check the result',
    body: 'See the calculated values and each formula, with your numbers filled in.',
  },
];

// A line that draws itself as you scroll through the section. The steps are shown in place; their reveal is CSS.
export function Steps() {
  const root = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    if (!root.current || reducedMotion()) return;
    const line = root.current.querySelector<SVGPathElement>('.steps-line');
    if (!line) return;

    // The path has pathLength 1, so a dash offset of (1 - p) draws the fraction p.
    utils.set(line, { strokeDasharray: '1', strokeDashoffset: '1' });
    return scrubWithScroll(root.current, (p) => {
      utils.set(line, { strokeDashoffset: String(1 - p) });
    });
  }, []);

  return (
    <section ref={root} id="how" className="mx-auto max-w-7xl scroll-mt-28 px-5 py-32 md:px-10">
      <div className="grid gap-16 lg:grid-cols-[1fr_1.2fr] lg:gap-24">
        <div>
          <p className="text-sm font-medium text-primary">How it works</p>
          <h2 className="mt-4 text-5xl leading-[0.95] font-semibold tracking-[-0.035em] md:text-7xl">
            Three steps, <span className="text-gradient-orange">in lab order.</span>
          </h2>
          <p className="mt-6 max-w-md text-lg leading-relaxed text-muted-foreground">
            The same order as the lab manual. Scroll and the line follows along.
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
            <li key={s.n}>
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
