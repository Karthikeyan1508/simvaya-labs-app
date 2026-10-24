// Viva facts for the sorting algorithm visualiser (quick sort). Copied from frontend
// components/sorting/sorting-lab.tsx, sort-theory.tsx and sort-quiz.ts. Keep the text in step with those files.
// shortcut: hand-copied, not shared with the frontend, upgrade by moving the lab text into one shared JSON file.

export const SORTING_VISUALISER = {
  id: 'sorting-visualiser',
  title: 'Sorting algorithm visualiser',
  aim: 'Follow how quick sort splits an array around a pivot, then measure how its work grows with the number of items.',
  theory: [
    'Quick sort is a divide-and-conquer sort. It picks one element as the pivot, moves the smaller items before it and the larger items after it, then sorts each side the same way.',
    'This visualiser uses the Lomuto partition. The last element of each segment is the pivot. A boundary index i moves right each time a smaller item is found, and that item is swapped to position i. At the end the pivot is swapped to position i + 1, where it stays.',
    'On a random array the pivot usually lands away from the ends, so the work grows as n log n. A sorted or reversed array gives the worst split every time with this pivot, so the work grows as n². The Time complexity section plots both against the measured average.',
  ],
  equations: [
    { label: 'Partition cost', expr: 'n − 1 comparisons', note: 'for a segment of n items' },
    { label: 'Best case', expr: 'C(n) ≈ n log₂ n', note: 'every pivot splits the segment in half' },
    {
      label: 'Average case',
      expr: 'C(n) = 2(n + 1)·H(n) − 4n',
      note: 'H(n) = 1 + 1/2 + … + 1/n, about 1.39 n log₂ n',
    },
    { label: 'Worst case', expr: 'C(n) = n(n − 1) / 2', note: 'the pivot is always the smallest or largest item' },
  ],
  // Multiple-choice questions from the lab quiz. The answer is the index of the correct option.
  quiz: [
    {
      q: 'Which element does this visualiser use as the pivot for each segment?',
      options: ['The first element', 'The last element', 'The middle element', 'A random element'],
      answer: 1,
      why: 'The Lomuto partition takes the last element of the segment as the pivot. The Code panel shows it.',
    },
    {
      q: 'How many comparisons does quick sort make on average for random input?',
      options: ['n', 'n log₂ n', 'n²', '2ⁿ'],
      answer: 1,
      why: 'Random pivots split the array about in half, so there are about log₂ n levels of about n comparisons each.',
    },
    {
      q: 'Which input makes this quick sort do the most work?',
      options: ['Random order', 'Already sorted or reversed', 'Half sorted', 'Only positive numbers'],
      answer: 1,
      why: 'With the last element as pivot, a sorted or reversed array splits into 0 and n − 1 items every time.',
    },
    {
      q: 'How many comparisons does the worst case take for n items?',
      options: ['n log₂ n', 'n(n − 1) / 2', 'n + 1', '2ⁿ'],
      answer: 1,
      why: 'Each partition removes one item from the next pass, so the comparisons add up to (n − 1) + (n − 2) + … + 1.',
    },
    {
      q: 'What does the final swap of a partition do?',
      options: [
        'Sorts the whole array in one pass',
        'Puts the pivot in its final position',
        'Removes duplicate values',
        'Doubles the segment size',
      ],
      answer: 1,
      why: 'After the partition the pivot has every smaller item before it, so it never moves again.',
    },
  ],
  // The visualiser takes between 6 and 30 distinct values.
  sizeRange: { min: 6, max: 30 },
};
