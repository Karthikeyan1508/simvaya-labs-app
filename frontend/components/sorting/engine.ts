// Quick sort with the Lomuto partition. The last element is the pivot.
// Each step keeps the whole array as it was after that step, so the visualiser can replay any step.

export type StepType = 'pick' | 'compare' | 'swap' | 'place' | 'done';

export interface SortStep {
  type: StepType;
  lo: number; // first position of the segment being sorted
  hi: number; // last position of the segment; the pivot sits here during partition
  i: number; // boundary index, -1 when unused
  j: number; // scanning index, -1 when unused
  arr: number[];
}

export type Preset = 'random' | 'nearly' | 'reversed';

export function quickSort(input: number[]): SortStep[] {
  const arr = [...input];
  const steps: SortStep[] = [];
  const emit = (type: StepType, lo: number, hi: number, i = -1, j = -1) =>
    steps.push({ type, lo, hi, i, j, arr: [...arr] });

  const sort = (lo: number, hi: number) => {
    if (lo > hi) return;
    if (lo === hi) {
      emit('done', lo, hi, lo);
      return;
    }
    emit('pick', lo, hi);
    const pivot = arr[hi];
    let i = lo - 1;
    for (let j = lo; j < hi; j++) {
      emit('compare', lo, hi, i, j);
      if (arr[j] < pivot) {
        i++;
        if (i !== j) {
          [arr[i], arr[j]] = [arr[j], arr[i]];
          emit('swap', lo, hi, i, j);
        }
      }
    }
    const p = i + 1;
    if (p !== hi) {
      [arr[p], arr[hi]] = [arr[hi], arr[p]];
      emit('swap', lo, hi, p, hi);
    }
    emit('place', lo, hi, p);
    sort(lo, p - 1);
    sort(p + 1, hi);
  };

  sort(0, arr.length - 1);
  return steps;
}

// Position of the pivot bar after a step, or -1 when no pivot is active.
export function pivotAt(step: SortStep | undefined): number {
  if (!step) return -1;
  if (step.type === 'pick' || step.type === 'compare') return step.hi;
  if (step.type === 'swap') return step.j === step.hi ? step.i : step.hi; // the final swap moves the pivot to i
  return -1;
}

export function describeStep(s: SortStep): string {
  const a = s.arr;
  switch (s.type) {
    case 'pick':
      return `Sort positions ${s.lo + 1} to ${s.hi + 1}. Pick the last element, ${a[s.hi]}, as pivot.`;
    case 'compare': {
      const pivot = a[s.hi];
      const x = a[s.j];
      return `Compare ${x} with the pivot ${pivot}: ${x < pivot ? 'smaller, so the boundary moves' : 'not smaller, so it stays right'}.`;
    }
    case 'swap':
      if (s.j === s.hi) return `Swap the pivot into position ${s.i + 1}.`;
      return `Swap ${a[s.i]} and ${a[s.j]} (positions ${s.i + 1} and ${s.j + 1}).`;
    case 'place':
      return `Pivot ${a[s.i]} is in place at position ${s.i + 1}.`;
    case 'done':
      return `Segment of one item, ${a[s.i]}, is done at position ${s.i + 1}.`;
  }
}

// Seeded generator so the first render matches on server and client.
export function seededRandom(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

// Distinct values from 1 to 99. Nearly sorted swaps about one pair in every eight positions.
export function makeInput(n: number, preset: Preset, rnd: () => number = Math.random): number[] {
  const pool = Array.from({ length: 99 }, (_, k) => k + 1);
  const picked: number[] = [];
  for (let k = 0; k < n; k++) {
    const r = k + Math.floor(rnd() * (99 - k));
    [pool[k], pool[r]] = [pool[r], pool[k]];
    picked.push(pool[k]);
  }
  picked.sort((a, b) => a - b);
  const a = preset === 'reversed' ? picked.reverse() : picked;
  if (preset === 'nearly') {
    for (let k = 0; k < Math.max(1, Math.round(n / 8)); k++) {
      const x = Math.floor(rnd() * n);
      const y = Math.floor(rnd() * n);
      [a[x], a[y]] = [a[y], a[x]];
    }
  } else if (preset === 'random') {
    for (let k = n - 1; k > 0; k--) {
      const r = Math.floor(rnd() * (k + 1));
      [a[k], a[r]] = [a[r], a[k]];
    }
  }
  return a;
}

// Comparisons quick sort makes on n items, as formulas. The average assumes random input.
export const balancedComparisons = (n: number) => (n > 1 ? n * Math.log2(n) : 0);
export const worstComparisons = (n: number) => (n * (n - 1)) / 2;
export function averageComparisons(n: number): number {
  if (n < 2) return 0;
  let h = 0;
  for (let k = 1; k <= n; k++) h += 1 / k;
  return 2 * (n + 1) * h - 4 * n;
}
