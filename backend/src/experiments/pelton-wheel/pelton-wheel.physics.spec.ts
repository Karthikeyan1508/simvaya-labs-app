import { calculate, netLoadKg, Q_MAX, simulate, stallLoadKg, sweep } from './pelton-wheel.physics';

describe('pelton wheel physics', () => {
  it('returns zero readings when pump is off', () => {
    const r = simulate({ pumpOn: false, nozzleStep: 8, deadWeightKg: 5, springKg: 1 });
    expect(r).toEqual({ p1: 0, p2: 0, pp: 0, speedRpm: 0, springKg: 1 });
  });

  it('venturi calc recovers full-opening flow', () => {
    const r = simulate({ pumpOn: true, nozzleStep: 8, deadWeightKg: 0, springKg: 0 });
    const c = calculate({ ...r, deadWeightKg: 0, springKg: 0 });
    expect(c.qActM3s).toBeCloseTo(Q_MAX, 4);
  });

  it('stalls when net load reaches stall load', () => {
    const r = simulate({ pumpOn: true, nozzleStep: 1, deadWeightKg: 40, springKg: 0 });
    expect(stallLoadKg(1)).toBeLessThan(41);
    expect(r.speedRpm).toBe(0);
  });

  it('peak efficiency near 75 percent on a full load sweep', () => {
    const best = Math.max(...sweep(8, 60).map((row) => row.etaPct));
    expect(best).toBeGreaterThan(70);
    expect(best).toBeLessThan(80);
  });

  it('net load follows T = T1 + T0 - T2', () => {
    expect(netLoadKg(5, 2)).toBe(4);
  });

  it('returns a calculation step for every manual formula', () => {
    const c = calculate({ deadWeightKg: 8, springKg: 1, p1: 2.8, p2: 3, pp: 3, speedRpm: 420 });
    expect(c.steps.map((s) => s.key)).toEqual(['dp', 'hv', 'q', 'hp', 'hi', 'net', 'torque', 'omega', 'bhp', 'ip', 'eta']);
  });
});
