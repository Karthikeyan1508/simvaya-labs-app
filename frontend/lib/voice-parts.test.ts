import { test } from 'node:test';
import assert from 'node:assert/strict';
import { partsMentioned } from './voice-parts.ts';

const exp = {
  components: [
    { id: 'nozzle', label: 'Nozzle' },
    { id: 'runner', label: 'Pelton runner' },
    { id: 'brake-drum', label: 'Brake drum' },
  ],
} as never;

test('finds parts in the order they are said', () => {
  const text = 'The nozzle turns pressure into a jet that hits the runner.';
  assert.deepEqual(partsMentioned(exp, text), ['nozzle', 'runner']);
});

test('matches a multi-word label by its last word', () => {
  assert.deepEqual(partsMentioned(exp, 'The runner spins with the shaft.'), ['runner']);
});

test('returns nothing when no part is named or there is no experiment', () => {
  assert.deepEqual(partsMentioned(exp, 'Nothing about machinery here.'), []);
  assert.deepEqual(partsMentioned(null, 'The nozzle'), []);
});
