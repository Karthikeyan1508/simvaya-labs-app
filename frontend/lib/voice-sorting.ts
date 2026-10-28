// Voice assistant for the sorting visualiser: the prompt, the topics and the tool set. The lab has no 3D model and no
// pump, so the parts are its panels, and the steps are the steps of the sort.
import { describeStep, type Preset, type SortStep } from '../components/sorting/engine.ts';
import { bool, controlName, isOneOf, partIds, partOf, partText, str, unknownPart, whole, type VoiceLabBridge, type VoicePart, type VoiceTools } from './voice-lab.ts';

export const SORTING_TITLE = 'Sorting algorithm visualiser';

export const SORTING_FIRST_MESSAGE =
  "Hello, I'm your lab assistant for the sorting algorithm visualiser. Do you have any doubts about the visualiser or quick sort?";

// The lab text from the theory section, kept in step with it.
export const SORTING_THEORY = [
  'Quick sort is a divide-and-conquer sort. It picks one element as the pivot, moves the smaller items before it and the larger items after it, then sorts each side the same way.',
  'This visualiser uses the Lomuto partition. The last element of each segment is the pivot. A boundary index i moves right each time a smaller item is found, and that item is swapped to position i. At the end the pivot is swapped to position i + 1, where it stays.',
];

export const SORTING_CONTROLS = ['array_size', 'preset'] as const;
export const SORTING_PRESETS = ['random', 'nearly', 'reversed'] as const satisfies readonly Preset[];
export const SORTING_SIZE_MIN = 6;
export const SORTING_SIZE_MAX = 30;

export const SORTING_TOPICS = ['principle', 'partition', 'cost', 'results'] as const;
export type SortingTopic = (typeof SORTING_TOPICS)[number];

const COST =
  'Partition cost is n − 1 comparisons for a segment of n items. Best case C(n) ≈ n log₂ n, when every pivot splits the segment in half. Average case C(n) = 2(n + 1)·H(n) − 4n, with H(n) = 1 + 1/2 + … + 1/n, about 1.39 n log₂ n. Worst case C(n) = n(n − 1) / 2, when the pivot is always the smallest or largest item.';

const RESULTS =
  'On a random array the pivot usually lands away from the ends, so the work grows as n log n. A sorted or reversed array gives the worst split every time with this pivot, so the work grows as n². The Time complexity section plots both against the measured average.';

// The panels the agent can name. Highlights light these panels on the lab page.
export const SORTING_VOICE_PARTS: VoicePart[] = [
  {
    id: 'bars',
    label: 'Bar chart',
    description:
      'One bar per value, taller for a bigger value. The pivot is dark, the bars being compared or swapped are orange, placed bars are grey and the rest are light.',
    specs: ['Replays each step of the sort'],
  },
  {
    id: 'playback',
    label: 'Playback bar',
    description: 'Plays or pauses the sort, steps back and forward, resets, and sets the speed. The text beside it describes the current step.',
    specs: [],
  },
  {
    id: 'counters',
    label: 'Comparison and swap counters',
    description: 'Count the comparisons and the swaps in the steps played so far.',
    specs: [],
  },
  {
    id: 'input',
    label: 'Input array',
    description: 'Sets the number of items and how the array starts: random, nearly sorted or reversed. Shuffle makes a new random array.',
    specs: ['6 to 30 distinct values'],
  },
  {
    id: 'steps',
    label: 'Step list',
    description: 'Every step of the run. Click a step to jump to it.',
    specs: [],
  },
  {
    id: 'code',
    label: 'Code reference',
    description: 'The quick sort code in five languages. Read only.',
    specs: ['Five languages'],
  },
];

export function sortingTopicText(topic: SortingTopic): string {
  switch (topic) {
    case 'principle':
      return SORTING_THEORY[0];
    case 'partition':
      return SORTING_THEORY[1];
    case 'cost':
      return COST;
    case 'results':
      return RESULTS;
  }
}

const PRESET_WORDS: Record<Preset, string> = { random: 'random', nearly: 'nearly sorted', reversed: 'reversed' };

// The run so far and the whole run, counted from the steps.
export function sortingReadingsText(b: { steps: SortStep[]; at: number; size: number; preset: Preset }): string {
  const count = (list: SortStep[], type: SortStep['type']) => list.filter((s) => s.type === type).length;
  const total = b.steps.length;
  const played = b.steps.slice(0, b.at);
  return [
    `Array of ${b.size} items, ${PRESET_WORDS[b.preset]}.`,
    `Step ${b.at} of ${total}.`,
    `So far ${count(played, 'compare')} comparisons and ${count(played, 'swap')} swaps.`,
    `Whole run: ${count(b.steps, 'compare')} comparisons and ${count(b.steps, 'swap')} swaps.`,
  ].join(' ');
}

export function buildSortingPrompt(content: { aim: string; objectives: string[]; apparatus: string[] }): string {
  const parts = SORTING_VOICE_PARTS.map((c) => `- [${c.id}] ${c.label}: ${c.description}${c.specs.length ? ` (${c.specs.join('; ')})` : ''}`);
  return [
    `You are the lab assistant for the Simvaya virtual lab. The student is working on: ${SORTING_TITLE}.`,
    `Aim: ${content.aim}`,
    `Objectives: ${content.objectives.join(' ')}`,
    `Theory: ${SORTING_THEORY.join(' ')}`,
    `Apparatus: ${content.apparatus.join('; ')}.`,
    '',
    'Parts of the visualiser (use these ids with the tools):',
    ...parts,
    '',
    'How to work:',
    '- After your greeting, ask whether the student has doubts about the visualiser or quick sort, then listen.',
    '- Keep answers short: two to four sentences unless they ask for more.',
    '- When you discuss a part, show it: call focus_part for one part, or highlight_parts for several.',
    '- The steps are the steps of the sort in the visualiser. go_to_step shows one step, and you read it back.',
    '- For facts about one part, call explain_part. For the principle, the partition, the cost or the results, call explain_topic. Do not make up numbers.',
    '- For current numbers, call read_readings.',
    `- set_control sets the input. control array_size takes ${SORTING_SIZE_MIN} to ${SORTING_SIZE_MAX}. control preset takes ${SORTING_PRESETS.join(', ')} (nearly means nearly sorted). Either one makes a new array and restarts the sort. Use it only when the student asks.`,
    '- explode_model, reassemble_model, set_view, set_pump and set_nozzle do not apply to this lab. They answer with a short message: say it and go on.',
    '- Use they/them for the student unless they tell you otherwise.',
  ].join('\n');
}

// The lab state and setters the sorting tools use. The lab rebuilds it on every render.
export interface SortingVoiceBridge extends VoiceLabBridge {
  steps: SortStep[]; // the whole run
  at: number; // steps played so far
  size: number;
  preset: Preset;
  setStep: (n: number) => void;
  newInput: (size: number, preset: Preset) => void;
  showVisualiser: () => void;
}

// Handlers take the agent's arguments as they arrive, so every one is checked here.
export function buildSortingVoiceTools(get: () => SortingVoiceBridge): VoiceTools {
  return {
    explode_model() {
      return 'This lab has no model to pull apart. The visualiser shows each step of the sort.';
    },

    reassemble_model() {
      return 'Nothing is pulled apart on this lab.';
    },

    focus_part(p) {
      const b = get();
      const c = partOf(b.parts, str(p.partId));
      if (!c) return unknownPart(b.parts);
      b.showVisualiser();
      b.setVoiceHighlight([c.id]);
      return `${c.label} is highlighted.`;
    },

    highlight_parts(p) {
      const b = get();
      const ids = partIds(b.parts, p.partIds);
      if (ids.length === 0) return unknownPart(b.parts);
      b.showVisualiser();
      b.setVoiceHighlight(ids);
      return `Highlighted ${ids.map((id) => partOf(b.parts, id)?.label ?? id).join(', ')}.`;
    },

    clear_highlight() {
      get().setVoiceHighlight(null);
      return 'Highlight cleared.';
    },

    set_view() {
      return 'This lab has no camera views. Use focus_part to point at a part.';
    },

    explain_part(p) {
      const b = get();
      const c = partOf(b.parts, str(p.partId));
      return c ? partText(c) : unknownPart(b.parts);
    },

    read_readings() {
      return sortingReadingsText(get());
    },

    set_pump(p) {
      if (bool(p.on) === null) return 'Say whether the sort is to play or pause.';
      return 'This lab has no pump. The student plays the sort with the playback bar.';
    },

    set_control(p) {
      const b = get();
      const c = controlName(p.control);
      if (c === 'array_size') {
        const n = whole(p.value, SORTING_SIZE_MIN, SORTING_SIZE_MAX);
        if (n === null) return `Array size must be a whole number from ${SORTING_SIZE_MIN} to ${SORTING_SIZE_MAX}.`;
        b.showVisualiser();
        b.newInput(n, b.preset);
        return `New array of ${n} items, ${PRESET_WORDS[b.preset]}.`;
      }
      if (c === 'preset') {
        const v = controlName(p.value).replace('nearly_sorted', 'nearly');
        if (!isOneOf(SORTING_PRESETS, v)) return `Preset must be one of: ${SORTING_PRESETS.join(', ')}.`;
        b.showVisualiser();
        b.newInput(b.size, v);
        return `New ${PRESET_WORDS[v]} array of ${b.size} items.`;
      }
      return `Unknown control. Use one of: ${SORTING_CONTROLS.join(', ')}.`;
    },

    set_nozzle() {
      return 'This lab has no nozzle.';
    },

    go_to_step(p) {
      const b = get();
      const total = b.steps.length;
      const n = whole(p.step, 1, total);
      if (n === null) return `Step must be a whole number from 1 to ${total}.`;
      b.showVisualiser();
      b.setStep(n);
      return `Step ${n}: ${describeStep(b.steps[n - 1])}`;
    },

    explain_topic(p) {
      const topic = str(p.topic);
      if (!isOneOf(SORTING_TOPICS, topic)) return `Topic must be one of: ${SORTING_TOPICS.join(', ')}.`;
      return sortingTopicText(topic);
    },
  };
}
