import { test } from 'node:test';
import assert from 'node:assert/strict';
import { quickSort } from '../components/sorting/engine.ts';
import {
  buildSortingPrompt,
  buildSortingVoiceTools,
  sortingReadingsText,
  sortingTopicText,
  SORTING_VOICE_PARTS,
  type SortingVoiceBridge,
} from './voice-sorting.ts';

const steps = quickSort([4, 1, 3, 2]);

// A bridge that records every call the tools make, in order.
function fake(over: Partial<SortingVoiceBridge> = {}) {
  const calls: string[] = [];
  const rec =
    (name: string) =>
    (...args: unknown[]) => {
      calls.push(args.length ? `${name}:${JSON.stringify(args)}` : name);
    };
  const b: SortingVoiceBridge = {
    parts: SORTING_VOICE_PARTS,
    prompt: 'prompt',
    firstMessage: 'hi',
    setVoiceHighlight: rec('setVoiceHighlight'),
    steps,
    at: 0,
    size: 4,
    preset: 'random',
    setStep: rec('setStep'),
    newInput: rec('newInput'),
    showVisualiser: rec('showVisualiser'),
    ...over,
  };
  return { b, calls, tools: buildSortingVoiceTools(() => b) };
}

test('readings count the run so far and the whole run from the steps', () => {
  const text = sortingReadingsText({ steps, at: 0, size: 4, preset: 'nearly' });
  assert.match(text, /^Array of 4 items, nearly sorted\. Step 0 of \d+\./);
  assert.match(text, /So far 0 comparisons and 0 swaps\./);
  const whole = sortingReadingsText({ steps, at: steps.length, size: 4, preset: 'random' });
  assert.match(whole, new RegExp(`Step ${steps.length} of ${steps.length}\\.`));
});

test('topics come from the theory section wording', () => {
  assert.match(sortingTopicText('cost'), /n log₂ n/);
  assert.match(sortingTopicText('partition'), /Lomuto partition/);
  assert.match(sortingTopicText('results'), /n²/);
});

test('prompt lists the visualiser panels by id', () => {
  const prompt = buildSortingPrompt({ aim: 'Aim.', objectives: ['One.'], apparatus: ['Bars.'] });
  assert.match(prompt, /\[bars\] Bar chart/);
  assert.match(prompt, /\[steps\] Step list/);
  assert.match(prompt, /explode_model, reassemble_model, set_view, set_pump and set_nozzle do not apply/);
});

test('focus_part opens the visualiser and rings the panel', () => {
  const { tools, calls } = fake();
  assert.equal(tools.focus_part({ partId: 'bars' }), 'Bar chart is highlighted.');
  assert.deepEqual(calls, ['showVisualiser', 'setVoiceHighlight:[["bars"]]']);
  assert.match(tools.focus_part({ partId: 'nope' }) as string, /^Unknown part\. Use one of: bars,/);
});

test('highlight_parts keeps known ids once and clear_highlight clears them', () => {
  const { tools, calls } = fake();
  assert.equal(tools.highlight_parts({ partIds: ['counters', 'counters', 'x'] }), 'Highlighted Comparison and swap counters.');
  assert.equal(tools.clear_highlight({}), 'Highlight cleared.');
  assert.deepEqual(calls.slice(-1), ['setVoiceHighlight:[null]']);
});

test('go_to_step plays the visualiser to a step and reads it back', () => {
  const { tools, calls } = fake();
  assert.match(tools.go_to_step({ step: 0 }) as string, /^Step must be a whole number from 1 to \d+\.$/);
  assert.match(tools.go_to_step({ step: 2 }) as string, /^Step 2: /);
  assert.deepEqual(calls, ['showVisualiser', 'setStep:[2]']);
});

test('tools with no control on this lab answer in one line and change nothing', () => {
  const { tools, calls } = fake();
  assert.match(tools.explode_model({}), /no model to pull apart/);
  assert.match(tools.set_view({ view: 'iso' }), /no camera views/);
  assert.match(tools.set_pump({ on: true }), /no pump/);
  assert.match(tools.set_nozzle({}), /no nozzle/);
  assert.deepEqual(calls, []);
});

test('explain_topic rejects a topic the lab does not have', () => {
  const { tools } = fake();
  assert.equal(tools.explain_topic({ topic: 'venturi' }), 'Topic must be one of: principle, partition, cost, results.');
});

test('set_control sets the array size and the preset, and validates', () => {
  const { tools, calls } = fake();
  assert.match(tools.set_control({ control: 'array_size', value: '20' }), /array of 20/);
  assert.match(tools.set_control({ control: 'preset', value: 'Nearly sorted' }), /nearly sorted array of 4/);
  assert.deepEqual(calls.filter((c) => c.startsWith('newInput')), ['newInput:[20,"random"]', 'newInput:[4,"nearly"]']);
  calls.length = 0;
  for (const bad of [
    { control: 'array_size', value: 5 },
    { control: 'array_size', value: 31 },
    { control: 'array_size', value: 'many' },
    { control: 'preset', value: 'sorted' },
    { control: 'speed', value: 3 },
    {},
  ]) assert.match(tools.set_control(bad), /must be|Unknown control/);
  assert.deepEqual(calls, []);
});
