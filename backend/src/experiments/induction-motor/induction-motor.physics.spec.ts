import {
  derive,
  EFFECTIVE_RADIUS_M,
  G,
  K_LOSS,
  OVERLOAD_TORQUE_FACTOR,
  P_NL,
  RATED_CURRENT_A,
  RATED_CURRENT_TOLERANCE,
  RATED_POWER_W,
  S_FL,
  simulate,
  SYNC_RPM,
  syncSpeedRpm,
  T_RATED,
} from './induction-motor.physics';
import type { RawReadings, SimReadings } from './induction-motor.types';

// A reading taken at about 10 kg net brake load, 4 A, 1440 rpm.
const good: RawReadings = { VL: 415, IL: 4, W1: 1000, W2: 500, s1Kg: 11, s2Kg: 1, speedRpm: 1440 };

const loadForTorque = (torqueNm: number) => torqueNm / (G * EFFECTIVE_RADIUS_M);

function expectAllFinite(r: SimReadings) {
  for (const v of Object.values(r)) {
    if (typeof v === 'number') expect(Number.isFinite(v)).toBe(true);
  }
}

describe('induction motor physics', () => {
  it('four-pole 50 Hz gives 1500 rpm', () => {
    expect(syncSpeedRpm(50, 4)).toBe(1500);
    expect(syncSpeedRpm(50, 2)).toBe(3000);
    expect(SYNC_RPM).toBe(1500);
  });

  it('1440 rpm gives 4 % slip', () => {
    expect(derive({ ...good, speedRpm: 1440 }).slipPct).toBeCloseTo(4, 9);
    expect(derive({ ...good, speedRpm: 1500 }).slipPct).toBeCloseTo(0, 9);
    expect(S_FL).toBeCloseTo(0.04, 12);
  });

  it('torque and output power use SI units', () => {
    const d = derive({ ...good, s1Kg: 11, s2Kg: 1, speedRpm: 1440 });
    expect(d.torqueNm).toBeCloseTo(9.81 * 10 * 0.126, 9); // N m
    expect(d.poutW).toBeCloseTo((2 * Math.PI * 1440 * 9.81 * 10 * 0.126) / 60, 6); // W
    expect(T_RATED).toBeCloseTo(14.59, 2);
    expect(RATED_POWER_W).toBe(2200);
  });

  it('rated torque at rated speed gives rated output and about 85 % efficiency', () => {
    const r = simulate(loadForTorque(T_RATED), true, true);
    expect(r.speedRpm).toBeCloseTo(1440, 6);
    expect(r.poutW).toBeCloseTo(RATED_POWER_W, 6);
    expect(r.etaPct).toBeCloseTo(85, 1);
    // Nameplate current is 4.5 A; the model gives about 4.52 A at rated output.
    expect(Math.abs(r.IL - RATED_CURRENT_A) / RATED_CURRENT_A).toBeLessThan(0.02);
  });

  it('W1 + W2 equals the total input, and a negative wattmeter keeps its sign', () => {
    const r = simulate(10, true, true);
    expect(r.W1 + r.W2).toBeCloseTo(r.pinW, 6);
    expect(r.pinW).toBeCloseTo(r.poutW + P_NL + K_LOSS * r.poutW * r.poutW, 6);

    const noLoad = simulate(0, true, true);
    expect(noLoad.W1).toBeGreaterThan(0);
    expect(noLoad.W2).toBeLessThan(0);
    expect(noLoad.W1 + noLoad.W2).toBeCloseTo(P_NL, 6);

    expect(derive({ ...good, W1: 100, W2: -300 }).pinW).toBe(-200);
  });

  it('efficiency is output over input times 100, with a guard', () => {
    const pout = (2 * Math.PI * 1440 * 9.81 * 10 * 0.126) / 60;
    expect(derive({ ...good, W1: 1500, W2: 500, s1Kg: 11, s2Kg: 1 }).etaPct).toBeCloseTo((100 * pout) / 2000, 9);
    expect(derive({ ...good, W1: 0, W2: 0 }).etaPct).toBeNull();
    expect(derive({ ...good, W1: -300, W2: 100 }).etaPct).toBeNull();
  });

  it('power factor uses the three-phase formula', () => {
    const d = derive({ ...good, W1: 1500, W2: 500, IL: 4.5 });
    expect(d.pf).toBeCloseTo(2000 / (Math.sqrt(3) * 415 * 4.5), 12);
  });

  it('zero load gives a nonzero current and no output', () => {
    const r = simulate(0, true, true);
    expect(r.IL).toBeGreaterThan(1);
    expect(r.IL).toBeCloseTo(1.25, 1);
    expect(r.speedRpm).toBeLessThan(SYNC_RPM);
    expect(r.speedRpm).toBeGreaterThan(SYNC_RPM * 0.99);
    expect(r.poutW).toBe(0);
    expect(r.etaPct).toBe(0);
    expect(r.warnings).toEqual([]);
  });

  it('speed never exceeds synchronous speed and falls as load rises', () => {
    let previous = Infinity;
    for (let load = 0; load <= 40; load += 0.25) {
      const r = simulate(load, true, true);
      expect(r.speedRpm).toBeLessThanOrEqual(SYNC_RPM);
      expect(r.speedRpm).toBeGreaterThan(0);
      expect(r.slipPct).toBeGreaterThanOrEqual(0);
      expect(r.speedRpm).toBeLessThanOrEqual(previous);
      previous = r.speedRpm;
    }
  });

  it('stopped, or supply off, gives zeros', () => {
    const stopped: SimReadings = {
      running: false,
      VL: 0,
      IL: 0,
      W1: 0,
      W2: 0,
      pinW: 0,
      pf: 0,
      speedRpm: 0,
      syncRpm: 0,
      slipPct: 0,
      torqueNm: 0,
      poutW: 0,
      etaPct: 0,
      s1Kg: 0,
      s2Kg: 0,
      warnings: [],
    };
    expect(simulate(20, false, true)).toEqual(stopped);
    expect(simulate(20, true, false)).toEqual(stopped);
  });

  it('overload_torque fires just above 1.25 x rated torque', () => {
    const limit = loadForTorque(OVERLOAD_TORQUE_FACTOR * T_RATED);
    expect(simulate(limit + 0.01, true, true).warnings).toContain('overload_torque');
    expect(simulate(limit - 0.01, true, true).warnings).not.toContain('overload_torque');
  });

  it('over_rated_current follows the rated current limit', () => {
    for (let load = 0; load <= 40; load += 0.1) {
      const r = simulate(load, true, true);
      expect(r.warnings.includes('over_rated_current')).toBe(r.IL > RATED_CURRENT_A * RATED_CURRENT_TOLERANCE);
    }
    expect(simulate(40, true, true).warnings).toEqual(expect.arrayContaining(['over_rated_current', 'overload_torque']));
  });

  it('flags zero or negative input power and S2 above S1', () => {
    const good = { VL: 415, IL: 4, W1: 1000, W2: 500, s1Kg: 11, s2Kg: 1, speedRpm: 1440 };
    expect(derive(good).valid).toBe(true);
    expect(derive({ ...good, W1: 0, W2: 0 }).valid).toBe(false);
    expect(derive({ ...good, W1: -200, W2: -100 }).valid).toBe(false);
    expect(derive({ ...good, W1: -200, W2: -100 }).pf).toBeNull();
    expect(derive({ ...good, s1Kg: 1, s2Kg: 2 }).valid).toBe(false);
  });

  it('derive recovers the simulated readings', () => {
    for (const load of [0, 5, 11.8, 20, 30, 40]) {
      const s = simulate(load, true, true);
      const d = derive({ VL: s.VL, IL: s.IL, W1: s.W1, W2: s.W2, s1Kg: s.s1Kg, s2Kg: s.s2Kg, speedRpm: s.speedRpm });
      expect(d.valid).toBe(true);
      expect(d.slipPct).toBeCloseTo(s.slipPct, 6);
      expect(d.torqueNm).toBeCloseTo(s.torqueNm, 6);
      expect(d.poutW).toBeCloseTo(s.poutW, 3);
      expect(d.pinW).toBeCloseTo(s.pinW, 6);
      expect(d.pf).toBeCloseTo(s.pf, 9);
      expect(d.etaPct).toBeCloseTo(s.etaPct, 6);
    }
  });

  it('invalid readings give null with issues', () => {
    const noCurrent = derive({ ...good, IL: 0 });
    expect(noCurrent.pf).toBeNull();
    expect(noCurrent.valid).toBe(false);
    expect(noCurrent.issues.join(' ')).toMatch(/IL/);
    expect(noCurrent.slipPct).toBeCloseTo(4, 9);

    const noVoltage = derive({ ...good, VL: 0 });
    expect(noVoltage.pf).toBeNull();
    expect(noVoltage.valid).toBe(false);

    const fast = derive({ ...good, speedRpm: 1600 });
    expect(fast.valid).toBe(false);
    expect(fast.issues.join(' ')).toMatch(/synchronous/);
    expect(fast.slipPct).toBeCloseTo(-6.6667, 3);

    const highPf = derive({ ...good, IL: 1 });
    expect(highPf.pf).toBeGreaterThan(1.05);
    expect(highPf.valid).toBe(false);
    expect(highPf.issues.join(' ')).toMatch(/Power factor/);

    const nanSpeed = derive({ ...good, speedRpm: NaN });
    expect(nanSpeed.slipPct).toBeNull();
    expect(nanSpeed.poutW).toBeNull();
    expect(nanSpeed.valid).toBe(false);
    expect(nanSpeed.issues.join(' ')).toMatch(/speed/);

    const infW1 = derive({ ...good, W1: Infinity });
    expect(infW1.pinW).toBeNull();
    expect(infW1.pf).toBeNull();
    expect(infW1.etaPct).toBeNull();
    expect(infW1.valid).toBe(false);

    const overflow = derive({ ...good, W1: 1e308, W2: 1e308 });
    expect(overflow.pinW).toBeNull();
    expect(overflow.valid).toBe(false);
  });

  it('never returns NaN or Infinity', () => {
    const cases: RawReadings[] = [
      good,
      { ...good, IL: 0 },
      { ...good, VL: 0, IL: 0 },
      { ...good, VL: -415, IL: -4 },
      { ...good, IL: 1e-300 },
      { ...good, speedRpm: NaN },
      { ...good, speedRpm: 3000 },
      { ...good, W1: Infinity },
      { ...good, W1: 1e308, W2: 1e308 },
      { ...good, W1: 0, W2: 0 },
      { ...good, s1Kg: -5, s2Kg: 40 },
    ];
    for (const c of cases) {
      const d = derive(c);
      for (const v of [d.syncRpm, d.slipPct, d.torqueNm, d.poutW, d.pinW, d.pf, d.etaPct]) {
        expect(v === null || Number.isFinite(v)).toBe(true);
      }
    }
  });

  it('simulate never returns NaN for a bad load', () => {
    for (const load of [NaN, Infinity, -5, 1000]) {
      expectAllFinite(simulate(load, true, true));
    }
    expect(simulate(NaN, true, true).s1Kg).toBeCloseTo(1, 12);
  });
});
