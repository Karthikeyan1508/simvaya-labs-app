import type { Question } from '@/lib/quiz';

// Quiz on quick sort with the Lomuto partition, the same pivot choice the visualiser uses.
export const SORT_QUIZ: Question[] = [
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
];
