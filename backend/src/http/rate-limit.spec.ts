import { createLimiter } from './rate-limit';

describe('createLimiter', () => {
  const clock = () => {
    let t = 1_000_000;
    return { now: () => t, advance: (ms: number) => (t += ms) };
  };

  it('allows up to the limit, then refuses with a retry time', () => {
    const c = clock();
    const l = createLimiter([{ limit: 3, windowMs: 60_000 }], c.now);
    expect([1, 2, 3].map(() => l.take('u1').ok)).toEqual([true, true, true]);
    const v = l.take('u1');
    expect(v.ok).toBe(false);
    expect(v.retryAfterSec).toBe(60);
  });

  it('keeps users apart', () => {
    const c = clock();
    const l = createLimiter([{ limit: 1, windowMs: 60_000 }], c.now);
    expect(l.take('a').ok).toBe(true);
    expect(l.take('a').ok).toBe(false);
    expect(l.take('b').ok).toBe(true);
  });

  it('recovers when the window has passed, and refused requests do not extend the block', () => {
    const c = clock();
    const l = createLimiter([{ limit: 2, windowMs: 10_000 }], c.now);
    l.take('u');
    l.take('u');
    c.advance(5_000);
    expect(l.take('u').ok).toBe(false);
    c.advance(5_001);
    expect(l.take('u').ok).toBe(true);
  });

  it('applies every rule, so a long window caps what a short one allows', () => {
    const c = clock();
    const l = createLimiter(
      [
        { limit: 5, windowMs: 1_000 },
        { limit: 6, windowMs: 100_000 },
      ],
      c.now,
    );
    for (let i = 0; i < 6; i++) {
      expect(l.take('u').ok).toBe(true);
      c.advance(1_500); // always inside the short rule
    }
    const v = l.take('u');
    expect(v.ok).toBe(false);
    expect(v.retryAfterSec).toBeGreaterThan(80);
  });
});
