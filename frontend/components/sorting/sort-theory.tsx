import { SectionHead } from '@/components/lab/section-head';
import { Eq } from '@/components/lab/sections/theory-section';

// The idea behind quick sort, the partition it uses, and the cost of each case.
export function SortTheory() {
  return (
    <div className="space-y-10">
      <SectionHead title="Theory" subtitle="How quick sort divides the work, and what it costs." />

      <section className="max-w-3xl space-y-4 text-[15px] leading-relaxed">
        <h3 className="text-sm font-semibold">Principle</h3>
        <p>
          Quick sort is a divide-and-conquer sort. It picks one element as the pivot, moves the smaller items before it
          and the larger items after it, then sorts each side the same way.
        </p>
        <p>
          This visualiser uses the Lomuto partition. The last element of each segment is the pivot. A boundary index i
          moves right each time a smaller item is found, and that item is swapped to position i. At the end the pivot is
          swapped to position i + 1, where it stays.
        </p>
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-semibold">Equations</h3>
        <div className="grid gap-3 md:grid-cols-2">
          <Eq label="Partition cost" expr="n − 1 comparisons" note="for a segment of n items" />
          <Eq label="Best case" expr="C(n) ≈ n log₂ n" note="every pivot splits the segment in half" />
          <Eq
            label="Average case"
            expr="C(n) = 2(n + 1)·H(n) − 4n"
            note="H(n) = 1 + 1/2 + … + 1/n, about 1.39 n log₂ n"
          />
          <Eq label="Worst case" expr="C(n) = n(n − 1) / 2" note="the pivot is always the smallest or largest item" />
        </div>
      </section>

      <section className="max-w-3xl space-y-3 text-[15px] leading-relaxed">
        <h3 className="text-sm font-semibold">Reading the results</h3>
        <p>
          On a random array the pivot usually lands away from the ends, so the work grows as n log n. A sorted or
          reversed array gives the worst split every time with this pivot, so the work grows as n². The Time complexity
          section plots both against the measured average.
        </p>
      </section>
    </div>
  );
}
