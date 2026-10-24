import assert from 'node:assert/strict';
import { test } from 'node:test';
import { IZ_MIN_A, RS_OHM, solve, sweepVs, VZ_V } from './solver.ts';

const base = { rs: RS_OHM, vz: VZ_V };
const ok = (r: ReturnType<typeof solve>) => {
  if (!r.ok) throw new Error(r.messages.join(' '));
  return r;
};

test('regulating: Vout is held at Vz and the load gets Vz / RL', () => {
  const r = ok(solve({ ...base, vs: 8, rl: 1000 }));
  assert.equal(r.vOut, VZ_V);
  assert.equal(r.regulating, true);
  assert.ok(Math.abs(r.iL - 0.0051) < 1e-9);
});

test('Zener current is the series current minus the load current', () => {
  const r = ok(solve({ ...base, vs: 8, rl: 1000 }));
  // (8 - 5.1) / 220 - 5.1 / 1000 = 8.08 mA
  assert.ok(Math.abs(r.iZ - 0.0080818) < 1e-6);
  assert.ok(Math.abs(r.iS - r.iZ - r.iL) < 1e-12, 'Kirchhoff: Is = Iz + IL');
});

test('no load: all the series current goes through the Zener', () => {
  const r = ok(solve({ ...base, vs: 15, rl: null }));
  assert.ok(Math.abs(r.iZ - (15 - 5.1) / 220) < 1e-9);
  assert.equal(r.iL, 0);
  assert.ok(Math.abs(r.pZ - 5.1 * r.iZ) < 1e-12);
});

test('output stays at Vz across the load values in the manual at 15 V', () => {
  for (const rl of [1000, 470, 220]) {
    assert.equal(ok(solve({ ...base, vs: 15, rl })).vOut, VZ_V, `RL=${rl}`);
  }
});

test('more load current means less Zener current, not more', () => {
  const izAt = (rl: number) => ok(solve({ ...base, vs: 15, rl })).iZ;
  assert.ok(izAt(1000) > izAt(470));
  assert.ok(izAt(470) > izAt(220));
});

test('below the Zener voltage: not regulating, output follows the divider', () => {
  const r = ok(solve({ ...base, vs: 3, rl: 1000 }));
  assert.equal(r.regulating, false);
  assert.equal(r.iZ, 0);
  assert.ok(Math.abs(r.vOut - (3 * 1000) / 1220) < 1e-12);
  assert.ok(r.warnings.some((w) => /not regulated/.test(w)));
});

test('series resistor power above 0.25 W is flagged at 15 V', () => {
  const r = ok(solve({ ...base, vs: 15, rl: null }));
  assert.ok(r.pRs > 0.25);
  assert.ok(r.warnings.some((w) => /Series resistor/.test(w)));
});

test('low Zener current is flagged', () => {
  const r = ok(solve({ ...base, vs: 6.3, rl: 1000 })); // just above the 6.2 V threshold at 1 kΩ
  assert.ok(r.iZ < IZ_MIN_A);
  assert.ok(r.warnings.some((w) => /below the regulating range/.test(w)));
});

test('sweep never gives negative Zener current or Vout above Vz', () => {
  for (const rl of [1000, 470, 220, null] as const) {
    for (const { op } of sweepVs({ ...base, rl }, 0, 15, 0.5)) {
      assert.ok(op.iZ >= 0, `iZ >= 0 at RL=${rl}`);
      assert.ok(op.vOut <= VZ_V + 1e-12, `Vout <= Vz at RL=${rl}`);
    }
  }
});

test('bad inputs give messages, never numbers', () => {
  for (const bad of [
    { vs: -1, rs: RS_OHM, vz: VZ_V, rl: 1000 },
    { vs: 16, rs: RS_OHM, vz: VZ_V, rl: 1000 },
    { vs: Number.NaN, rs: RS_OHM, vz: VZ_V, rl: 1000 },
    { vs: 8, rs: 0, vz: VZ_V, rl: 1000 },
    { vs: 8, rs: RS_OHM, vz: -5, rl: 1000 },
    { vs: 8, rs: RS_OHM, vz: VZ_V, rl: -470 },
  ]) {
    const r = solve(bad);
    assert.equal(r.ok, false, JSON.stringify(bad));
  }
});
