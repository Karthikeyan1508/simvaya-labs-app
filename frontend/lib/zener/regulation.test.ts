import assert from 'node:assert/strict';
import { test } from 'node:test';
import { lineRegulation, loadCurve, loadRegulation } from './regulation.ts';

test('line regulation: change in Vout per volt of input at one load', () => {
  const r = lineRegulation([
    { vs: 8, rl: 1000, vOut: 5.1 },
    { vs: 12, rl: 1000, vOut: 5.12 },
    { vs: 15, rl: 1000, vOut: 5.13 },
    { vs: 15, rl: 220, vOut: 5.1 },
  ]);
  assert.ok(r);
  assert.equal(r.rl, 1000);
  assert.deepEqual(r.vsSpan, [8, 15]);
  assert.ok(Math.abs(r.value - 0.03 / 7) < 1e-12);
});

test('line regulation needs two input voltages at one load', () => {
  assert.equal(lineRegulation([{ vs: 8, rl: 1000, vOut: 5.1 }]), null);
  assert.equal(lineRegulation([{ vs: 8, rl: 1000, vOut: 5.1 }, { vs: 9, rl: 470, vOut: 5.1 }]), null);
});

test('load regulation: no-load against full-load, in percent', () => {
  // 6.3 V input with 220 ohm: the Zener is off, so the output falls with the load.
  const r = loadRegulation([
    { vs: 6.3, rl: null, vOut: 5.1 },
    { vs: 6.3, rl: 220, vOut: 3.15 },
    { vs: 6.3, rl: 1000, vOut: 4.7 },
  ]);
  assert.ok(r);
  assert.equal(r.rlFull, 220);
  assert.ok(Math.abs(r.pct - ((5.1 - 3.15) / 3.15) * 100) < 1e-9);
});

test('load regulation is zero while the Zener holds the output', () => {
  const r = loadRegulation([
    { vs: 15, rl: null, vOut: 5.1 },
    { vs: 15, rl: 220, vOut: 5.1 },
  ]);
  assert.ok(r);
  assert.equal(r.pct, 0);
});

test('load regulation needs a no-load reading', () => {
  assert.equal(loadRegulation([{ vs: 15, rl: 220, vOut: 5.1 }]), null);
});

test('load curve: output against load current, sorted, load current from the solver', () => {
  const pts = loadCurve(15, [1000, 470, 220]);
  assert.equal(pts.length, 3);
  assert.ok(pts[0].x < pts[1].x && pts[1].x < pts[2].x);
  assert.ok(pts.every((p) => Math.abs(p.y - 5.1) < 1e-12));
});
