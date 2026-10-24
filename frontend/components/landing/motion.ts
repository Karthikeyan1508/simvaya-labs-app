import { animate } from 'animejs';

// Visitors who ask for less motion get the finished page with no animation.
export const reducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Smooth ramp from 0 at `a` to 1 at `b`, eased at both ends.
export const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

// How far through a tall section the page has scrolled, from 0 to 1.
export const progressOf = (el: HTMLElement) => {
  const total = el.offsetHeight - window.innerHeight;
  if (total <= 0) return 0;
  return Math.min(1, Math.max(0, -el.getBoundingClientRect().top / total));
};

// Pull an element a little toward the pointer, the way a magnet would.
export const magnetPull = (el: HTMLElement, clientX: number, clientY: number, strength = 0.3) => {
  const r = el.getBoundingClientRect();
  animate(el, {
    x: (clientX - (r.left + r.width / 2)) * strength,
    y: (clientY - (r.top + r.height / 2)) * strength,
    duration: 450,
    ease: 'out(3)',
  });
};

export const magnetRelease = (el: HTMLElement) => {
  animate(el, { x: 0, y: 0, duration: 800, ease: 'out(4)' });
};

// Runs `play` once, the first time `trigger` has risen into the lower part of the viewport.
// It follows scroll position, so it works the same in every browser. Returns a cleanup function.
export const playWhenVisible = (trigger: Element, play: () => void) => {
  let done = false;
  let frame = 0;
  const schedule = () => {
    if (!frame) frame = requestAnimationFrame(check);
  };
  const check = () => {
    frame = 0;
    if (done || trigger.getBoundingClientRect().top > window.innerHeight * 0.88) return;
    done = true;
    window.removeEventListener('scroll', schedule);
    window.removeEventListener('resize', schedule);
    play();
  };
  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule);
  check();
  return () => {
    done = true;
    window.removeEventListener('scroll', schedule);
    window.removeEventListener('resize', schedule);
    cancelAnimationFrame(frame);
  };
};

// Calls `onProgress` with a value from 0 to 1 as `trigger` moves up through the viewport.
export const scrubWithScroll = (trigger: Element, onProgress: (p: number) => void) => {
  let frame = 0;
  const update = () => {
    frame = 0;
    const r = trigger.getBoundingClientRect();
    const span = r.height + window.innerHeight * 0.6;
    onProgress(Math.min(1, Math.max(0, (window.innerHeight * 0.8 - r.top) / span)));
  };
  const schedule = () => {
    if (!frame) frame = requestAnimationFrame(update);
  };
  update();
  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule);
  return () => {
    window.removeEventListener('scroll', schedule);
    window.removeEventListener('resize', schedule);
    cancelAnimationFrame(frame);
  };
};
