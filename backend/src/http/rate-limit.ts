// A sliding-window limiter, kept apart from Nest so it can be tested on its own.
// shortcut: counts live in this process's memory, so each API instance has its own budget and a restart resets it.
// Move to Redis or the database when the API runs more than one instance.
export interface Rule {
  limit: number; // requests allowed in the window
  windowMs: number;
}

export interface Verdict {
  ok: boolean;
  retryAfterSec: number;
}

export function createLimiter(rules: Rule[], now: () => number = Date.now) {
  const hits = new Map<string, number[]>();
  const longest = Math.max(...rules.map((r) => r.windowMs));
  let calls = 0;

  // Drops keys whose newest hit is older than every window, so the map cannot grow without bound.
  const sweep = (t: number) => {
    for (const [key, times] of hits) {
      if (times.length === 0 || t - times[times.length - 1] > longest) hits.delete(key);
    }
  };

  return {
    // Records the request when it is allowed. A refused request is not recorded, so waiting is enough to recover.
    take(key: string): Verdict {
      const t = now();
      if (++calls % 500 === 0) sweep(t);
      const times = (hits.get(key) ?? []).filter((h) => t - h < longest);

      let wait = 0;
      for (const rule of rules) {
        const inWindow = times.filter((h) => t - h < rule.windowMs);
        if (inWindow.length >= rule.limit) {
          // The oldest hit in this window leaves it after windowMs, which frees one slot.
          wait = Math.max(wait, inWindow[inWindow.length - rule.limit] + rule.windowMs - t);
        }
      }
      if (wait > 0) {
        hits.set(key, times);
        return { ok: false, retryAfterSec: Math.max(1, Math.ceil(wait / 1000)) };
      }
      times.push(t);
      hits.set(key, times);
      return { ok: true, retryAfterSec: 0 };
    },
  };
}
