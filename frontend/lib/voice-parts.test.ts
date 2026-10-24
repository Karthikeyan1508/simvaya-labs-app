import { test } from 'node:test';
import assert from 'node:assert/strict';
import { partsMentioned } from './voice-parts.ts';

const parts = [
  { id: 'nozzle', label: 'Nozzle' },
  { id: 'runner', label: 'Pelton runner' },
  { id: 'brake-drum', label: 'Brake drum' },
];

test('finds parts in the order they are said', () => {
  const text = 'The nozzle turns pressure into a jet that hits the runner.';
  assert.deepEqual(partsMentioned(parts, text), ['nozzle', 'runner']);
});

test('matches a multi-word label by its last word', () => {
  assert.deepEqual(partsMentioned(parts, 'The runner spins with the shaft.'), ['runner']);
});

test('returns nothing when no part is named or there are no parts', () => {
  assert.deepEqual(partsMentioned(parts, 'Nothing about machinery here.'), []);
  assert.deepEqual(partsMentioned(null, 'The nozzle'), []);
});
