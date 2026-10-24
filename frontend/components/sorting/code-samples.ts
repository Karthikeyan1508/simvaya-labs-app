// Read-only code shown on the sorting page. Nothing here is edited or run in the browser.

export type LanguageId = 'pseudocode' | 'c' | 'cpp' | 'java' | 'python' | 'javascript';

export const LANGUAGES: { id: LanguageId; label: string; file: string }[] = [
  { id: 'pseudocode', label: 'Pseudocode', file: 'quicksort.pseudo' },
  { id: 'c', label: 'C', file: 'quicksort.c' },
  { id: 'cpp', label: 'C++', file: 'quicksort.cpp' },
  { id: 'java', label: 'Java', file: 'QuickSort.java' },
  { id: 'python', label: 'Python', file: 'quicksort.py' },
  { id: 'javascript', label: 'JavaScript', file: 'quicksort.js' },
];

// The same program, the way the visualiser runs it: Lomuto partition, the last element as pivot.
export const MAIN_CODE: Record<LanguageId, string> = {
  pseudocode: String.raw`// Quick sort with the Lomuto partition scheme.
// The last element of each segment is the pivot.

procedure partition(a, lo, hi)
    pivot <- a[hi]
    i <- lo - 1                      // end of the "smaller than pivot" region
    for j <- lo to hi - 1            // j scans every element except the pivot
        if a[j] < pivot then
            i <- i + 1
            swap a[i] and a[j]
    swap a[i + 1] and a[hi]          // drop the pivot in its final place
    return i + 1

procedure quickSort(a, lo, hi)
    if lo < hi then                  // zero or one item is already sorted
        p <- partition(a, lo, hi)
        quickSort(a, lo, p - 1)
        quickSort(a, p + 1, hi)

// Main
data <- [38, 27, 43, 3, 9, 82, 10]
print "Before:", data
quickSort(data, 0, length(data) - 1)
print "After: ", data
`,

  c: String.raw`/* Quick sort with the Lomuto partition scheme.
 * The last element of each segment is the pivot. */
#include <stdio.h>

static void swap(int *x, int *y) {
    int t = *x;
    *x = *y;
    *y = t;
}

/* Rearrange a[lo..hi] so the pivot a[hi] sits at its final position.
 * Smaller values go to its left, the rest to its right. Returns that position. */
static int partition(int a[], int lo, int hi) {
    int pivot = a[hi];
    int i = lo - 1;                  /* end of the "smaller than pivot" region */
    for (int j = lo; j < hi; j++) {  /* j scans every element except the pivot */
        if (a[j] < pivot) {
            i++;
            swap(&a[i], &a[j]);
        }
    }
    swap(&a[i + 1], &a[hi]);         /* drop the pivot in its final place */
    return i + 1;
}

static void quick_sort(int a[], int lo, int hi) {
    if (lo < hi) {                   /* zero or one item is already sorted */
        int p = partition(a, lo, hi);
        quick_sort(a, lo, p - 1);
        quick_sort(a, p + 1, hi);
    }
}

int main(void) {
    int data[] = {38, 27, 43, 3, 9, 82, 10};
    int n = (int)(sizeof data / sizeof data[0]);

    printf("Before:");
    for (int k = 0; k < n; k++) printf(" %d", data[k]);
    printf("\n");

    quick_sort(data, 0, n - 1);

    printf("After: ");
    for (int k = 0; k < n; k++) printf(" %d", data[k]);
    printf("\n");
    return 0;
}
`,

  cpp: String.raw`// Quick sort with the Lomuto partition scheme.
// The last element of each segment is the pivot.
#include <iostream>
#include <utility>
#include <vector>

// Rearrange a[lo..hi] so the pivot a[hi] sits at its final position.
// Smaller values go to its left, the rest to its right. Returns that position.
int partition(std::vector<int>& a, int lo, int hi) {
    int pivot = a[hi];
    int i = lo - 1;                    // end of the "smaller than pivot" region
    for (int j = lo; j < hi; ++j) {    // j scans every element except the pivot
        if (a[j] < pivot) {
            ++i;
            std::swap(a[i], a[j]);
        }
    }
    std::swap(a[i + 1], a[hi]);        // drop the pivot in its final place
    return i + 1;
}

void quickSort(std::vector<int>& a, int lo, int hi) {
    if (lo < hi) {                     // zero or one item is already sorted
        int p = partition(a, lo, hi);
        quickSort(a, lo, p - 1);
        quickSort(a, p + 1, hi);
    }
}

int main() {
    std::vector<int> data = {38, 27, 43, 3, 9, 82, 10};

    std::cout << "Before:";
    for (int x : data) std::cout << ' ' << x;
    std::cout << '\n';

    quickSort(data, 0, static_cast<int>(data.size()) - 1);

    std::cout << "After: ";
    for (int x : data) std::cout << ' ' << x;
    std::cout << '\n';
    return 0;
}
`,

  java: String.raw`// Quick sort with the Lomuto partition scheme.
// The last element of each segment is the pivot.
// Save this file as QuickSort.java, because the class is public.
import java.util.Arrays;

public class QuickSort {

    // Rearrange a[lo..hi] so the pivot a[hi] sits at its final position.
    // Smaller values go to its left, the rest to its right. Returns that position.
    static int partition(int[] a, int lo, int hi) {
        int pivot = a[hi];
        int i = lo - 1;                    // end of the "smaller than pivot" region
        for (int j = lo; j < hi; j++) {    // j scans every element except the pivot
            if (a[j] < pivot) {
                i++;
                swap(a, i, j);
            }
        }
        swap(a, i + 1, hi);                // drop the pivot in its final place
        return i + 1;
    }

    static void quickSort(int[] a, int lo, int hi) {
        if (lo < hi) {                     // zero or one item is already sorted
            int p = partition(a, lo, hi);
            quickSort(a, lo, p - 1);
            quickSort(a, p + 1, hi);
        }
    }

    static void swap(int[] a, int x, int y) {
        int t = a[x];
        a[x] = a[y];
        a[y] = t;
    }

    public static void main(String[] args) {
        int[] data = {38, 27, 43, 3, 9, 82, 10};
        System.out.println("Before: " + Arrays.toString(data));

        quickSort(data, 0, data.length - 1);

        System.out.println("After:  " + Arrays.toString(data));
    }
}
`,

  python: `# Quick sort with the Lomuto partition scheme.
# The last element of each segment is the pivot.


def partition(a, lo, hi):
    """Rearrange a[lo..hi] so the pivot a[hi] sits at its final position.
    Smaller values go to its left, the rest to its right. Returns that position."""
    pivot = a[hi]
    i = lo - 1                       # end of the "smaller than pivot" region
    for j in range(lo, hi):          # j scans every element except the pivot
        if a[j] < pivot:
            i += 1
            a[i], a[j] = a[j], a[i]
    a[i + 1], a[hi] = a[hi], a[i + 1]  # drop the pivot in its final place
    return i + 1


def quick_sort(a, lo=0, hi=None):
    """Sort a[lo..hi] in place."""
    if hi is None:
        hi = len(a) - 1
    if lo < hi:                      # zero or one item is already sorted
        p = partition(a, lo, hi)
        quick_sort(a, lo, p - 1)
        quick_sort(a, p + 1, hi)


if __name__ == "__main__":
    data = [38, 27, 43, 3, 9, 82, 10]
    print("Before:", data)
    quick_sort(data)
    print("After: ", data)
`,

  javascript: `// Quick sort with the Lomuto partition scheme.
// The last element of each segment is the pivot.

function partition(a, lo, hi) {
  const pivot = a[hi];
  let i = lo - 1; // end of the "smaller than pivot" region
  for (let j = lo; j < hi; j++) {
    // j scans every element except the pivot
    if (a[j] < pivot) {
      i++;
      [a[i], a[j]] = [a[j], a[i]];
    }
  }
  [a[i + 1], a[hi]] = [a[hi], a[i + 1]]; // drop the pivot in its final place
  return i + 1;
}

function quickSort(a, lo = 0, hi = a.length - 1) {
  if (lo < hi) {
    // zero or one item is already sorted
    const p = partition(a, lo, hi);
    quickSort(a, lo, p - 1);
    quickSort(a, p + 1, hi);
  }
  return a;
}

const data = [38, 27, 43, 3, 9, 82, 10];
console.log("Before:", data);
quickSort(data);
console.log("After: ", data);
`,
};

export interface Approach {
  id: string;
  name: string;
  idea: string;
  pivot: string;
  time: string;
  whenToUse: string;
  // Pseudocode only, so every approach reads the same whatever language the student uses.
  pseudocode: string;
}

export const APPROACHES: Approach[] = [
  {
    id: 'lomuto',
    name: 'Lomuto partition',
    idea: 'One pass moves every value smaller than the pivot to the left. The pivot then goes in the gap between the two groups.',
    pivot: 'The last element of the segment.',
    time: 'Average O(n log n). Worst case O(n²), for example on input that is already sorted.',
    whenToUse: 'Teaching and tracing. The visualiser uses it because every step is easy to follow. It does more swaps than Hoare.',
    pseudocode: String.raw`procedure partition(a, lo, hi)
    pivot <- a[hi]
    i <- lo - 1
    for j <- lo to hi - 1
        if a[j] < pivot then
            i <- i + 1
            swap a[i] and a[j]
    swap a[i + 1] and a[hi]
    return i + 1
`,
  },
  {
    id: 'hoare',
    name: 'Hoare partition',
    idea: 'Two pointers start at the ends and move toward each other, swapping the pairs that are on the wrong side. The first element is the pivot.',
    pivot: 'The first element of the segment.',
    time: 'Average O(n log n). Worst case O(n²), for example on input that is already sorted.',
    whenToUse: 'The usual choice in practice. It does fewer swaps than Lomuto, and it handles repeated values better.',
    pseudocode: String.raw`procedure hoarePartition(a, lo, hi)
    pivot <- a[lo]
    i <- lo - 1
    j <- hi + 1
    loop forever
        repeat
            i <- i + 1
        until a[i] >= pivot
        repeat
            j <- j - 1
        until a[j] <= pivot
        if i >= j then
            return j
        swap a[i] and a[j]
`,
  },
  {
    id: 'median',
    name: 'Median of three',
    idea: 'Look at the first, middle and last values, and use their median as the pivot. A sorted or reversed input then gives a balanced split.',
    pivot: 'The median of the first, middle and last elements.',
    time: 'Average O(n log n). Worst case O(n²) is still possible, but it is rare on ordinary input.',
    whenToUse: 'A good default when the input is often nearly sorted, as with the Nearly sorted preset.',
    pseudocode: String.raw`procedure medianOfThree(a, lo, hi)
    mid <- (lo + hi) divided by 2, rounded down
    sort a[lo], a[mid], a[hi] so that a[lo] <= a[mid] <= a[hi]
    swap a[mid] and a[hi]          // the median becomes the pivot at the end
    return partition(a, lo, hi)    // the Lomuto partition, as above
`,
  },
  {
    id: 'random',
    name: 'Random pivot',
    idea: 'Pick any element of the segment at random as the pivot, then partition as usual.',
    pivot: 'A random element of the segment.',
    time: 'Expected O(n log n) for every input. The O(n²) case needs unlucky random choices, and it is very unlikely.',
    whenToUse: 'When the input could be chosen by someone who wants to slow the sort down.',
    pseudocode: String.raw`procedure randomPivotPartition(a, lo, hi)
    r <- a random position from lo to hi
    swap a[r] and a[hi]            // move that element into the last slot
    return partition(a, lo, hi)    // then the Lomuto partition, as above
`,
  },
  {
    id: 'three-way',
    name: 'Three-way partition',
    idea: 'Split the segment into three parts: smaller than the pivot, equal to it, and larger. The equal part is already in place, so it is never sorted again.',
    pivot: 'The first element of the segment.',
    time: 'Average O(n log n). With many repeated values it is much faster, because each equal value is finished in one pass.',
    whenToUse: 'Input with many duplicates, such as exam marks or grades.',
    pseudocode: String.raw`procedure threeWayPartition(a, lo, hi)
    // Afterwards: a[lo..lt-1] < pivot, a[lt..gt] = pivot, a[gt+1..hi] > pivot.
    pivot <- a[lo]
    lt <- lo
    i <- lo
    gt <- hi
    while i <= gt
        if a[i] < pivot then
            swap a[lt] and a[i]
            lt <- lt + 1
            i <- i + 1
        else if a[i] > pivot then
            swap a[i] and a[gt]
            gt <- gt - 1
        else
            i <- i + 1
    return (lt, gt)
`,
  },
  {
    id: 'iterative',
    name: 'Iterative with a stack',
    idea: 'The same algorithm, but the segments still to sort are kept in a list instead of using recursive calls.',
    pivot: 'Any rule works here. This example uses the Lomuto last-element pivot.',
    time: 'Same as the recursive version. The list of segments can grow to O(n) in the worst case, unless the smaller side is handled first.',
    whenToUse: 'Large inputs, or languages where deep recursion can overflow the call stack.',
    pseudocode: String.raw`procedure quickSortIterative(a)
    stack <- empty list
    push (0, length(a) - 1) onto stack     // segments still waiting to be sorted
    while stack is not empty
        (lo, hi) <- pop from stack
        if lo < hi then
            p <- partition(a, lo, hi)      // the Lomuto partition, as above
            push (lo, p - 1) onto stack
            push (p + 1, hi) onto stack
`,
  },
];
