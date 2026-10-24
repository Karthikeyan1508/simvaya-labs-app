'use client';

import { animate } from 'animejs';
import { useLayoutEffect, useRef } from 'react';
import { reducedMotion } from './motion';

const ITEMS = ['Computer Science', 'Electronics', 'Electrical', 'Civil', 'Mechanical', 'Digital twins', 'Live calculations'];

// A slow loop of the disciplines. The track holds two copies, so moving it by half its width loops cleanly.
export function Marquee() {
  const track = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!track.current || reducedMotion()) return;
    const loop = animate(track.current, { x: ['0%', '-50%'], duration: 30000, ease: 'linear', loop: true });
    return () => {
      loop.cancel();
    };
  }, []);

  return (
    <div aria-hidden className="overflow-hidden border-y border-border/60 py-6">
      <div ref={track} className="flex w-max">
        {[...ITEMS, ...ITEMS].map((item, i) => (
          <span
            key={i}
            className="flex items-center pr-10 text-3xl font-semibold tracking-[-0.03em] whitespace-nowrap text-muted-foreground/70 md:text-5xl"
          >
            {item}
            <span className="ml-10 size-2.5 rounded-full bg-primary" />
          </span>
        ))}
      </div>
    </div>
  );
}
