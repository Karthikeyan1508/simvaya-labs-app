import assert from 'node:assert/strict';
import { test } from 'node:test';
import { checkWiring, joinError, meterReading, type Wiring } from './wiring.ts';
import { RS_OHM, solve, VZ_V } from './solver.ts';

const at = { x: 0, y: 0 };
const bench = (withLoad: boolean): Wiring => ({
  parts: { supply: at, resistor: at, zener: at, meter: at, ...(withLoad ? { load: at } : {}) },
  wires: [],
});
const correctLoad: [string, string][] = [
  ['supply.+', 'resistor.a'],
  ['resistor.b', 'zener.cathode'],
  ['resistor.b', 'load.a'],
  ['zener.anode', 'supply.-'],
  ['load.b', 'supply.-'],
];
const withWires = (w: Wiring, wires: [string, string][]): Wiring => ({ ...w, wires });

test('the reference circuit wired by hand checks as correct', () => {
  const r = checkWiring(withWires(bench(true), correctLoad), 1000);
  assert.equal(r.ok, true, r.missing.concat(r.wrong, r.extra).join(' | '));
  assert.equal(r.correct.length, 5);
});

test('a missing wire is named by its two ends', () => {
  const r = checkWiring(withWires(bench(true), correctLoad.slice(1)), 1000);
  assert.equal(r.ok, false);
  assert.deepEqual(r.missing, ['Missing wire: Supply + to Rs end A.']);
  assert.equal(r.correct.length, 4);
});

test('a wrong join is reported as a short between the two named terminals', () => {
  const r = checkWiring(withWires(bench(true), [...correctLoad, ['zener.anode', 'supply.+']]), 1000);
  assert.equal(r.ok, false);
  assert.equal(r.wrong.length, 1);
  assert.match(r.wrong[0], /^Wrong: .* is joined to .*\. They must stay apart\.$/);
});

test('with no load, a wired load resistor is extra', () => {
  const noLoad = withWires({ parts: { ...bench(false).parts, load: at }, wires: [] }, [
    ['supply.+', 'resistor.a'],
    ['resistor.b', 'zener.cathode'],
    ['zener.anode', 'supply.-'],
    ['resistor.b', 'load.a'],
  ]);
  const r = checkWiring(noLoad, null);
  assert.equal(r.ok, false);
  assert.equal(r.extra.length, 1);
  assert.match(r.extra[0], /RL end A/);
});

test('joins: self, dead short and duplicate are refused', () => {
  const w = withWires(bench(true), [['supply.+', 'resistor.a']]);
  assert.match(joinError(w, 'load.a', 'load.a') ?? '', /different terminals/);
  assert.match(joinError(w, 'supply.+', 'supply.-') ?? '', /Dead short/);
  assert.match(joinError(w, 'resistor.a', 'supply.+') ?? '', /already joined/);
  assert.equal(joinError(w, 'load.a', 'load.b'), null);
});

test('meter: open circuit when a probe is unwired, no reading until the circuit is correct', () => {
  const op = solve({ vs: 8, rs: RS_OHM, vz: VZ_V, rl: 1000 });
  const w = withWires(bench(true), correctLoad);
  assert.equal(meterReading(w, 1000, op.ok ? op : null, 8), 'open circuit');
  const probed = withWires(w, [...correctLoad, ['meter.red', 'resistor.b'], ['meter.black', 'supply.-']]);
  assert.equal(meterReading(probed, 1000, op.ok ? op : null, 8), '5.10 V');
  const unfinished = withWires(w, [['meter.red', 'resistor.b'], ['meter.black', 'supply.-']]);
  assert.equal(meterReading(unfinished, 1000, op.ok ? op : null, 8), 'no reading');
});
