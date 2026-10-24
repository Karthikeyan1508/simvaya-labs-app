import { call } from './account';
import type { DerivedReadings, ExperimentInfo, RawReadings, SimReadings } from './induction';

// Induction motor calls. The lab is public like the Pelton endpoints, so no session token is sent.
const PATH = '/experiments/induction-motor';

const post = <T>(path: string, body: unknown) =>
  call<T>(path, { method: 'POST', body: JSON.stringify(body) }, false);

export const getInductionExperiment = () => call<ExperimentInfo>(PATH, {}, false);

export const simulateInduction = (body: { loadKg: number; running: boolean; supplyOn: boolean }) =>
  post<SimReadings>(`${PATH}/simulate`, body);

export const calculateInduction = (raw: RawReadings) => post<DerivedReadings>(`${PATH}/calculate`, raw);

export const emptyRaw = (): RawReadings => ({ VL: 0, IL: 0, W1: 0, W2: 0, s1Kg: 0, s2Kg: 0, speedRpm: 0 });

// The raw readings a capture copies from the simulation. The backend calculates the rest.
export const rawFromSim = (sim: SimReadings): RawReadings => ({
  VL: sim.VL,
  IL: sim.IL,
  W1: sim.W1,
  W2: sim.W2,
  s1Kg: sim.s1Kg,
  s2Kg: sim.s2Kg,
  speedRpm: sim.speedRpm,
});

// Display strings for the calculated values. A missing value shows a dash.
export function formatDerived(d: DerivedReadings | null) {
  const f = (v: number | null | undefined, digits: number) =>
    v === null || v === undefined || !Number.isFinite(v) ? '—' : v.toFixed(digits);
  return {
    syncRpm: f(d?.syncRpm, 0),
    slipPct: f(d?.slipPct, 2),
    torqueNm: f(d?.torqueNm, 3),
    poutW: f(d?.poutW, 1),
    pinW: f(d?.pinW, 1),
    pf: f(d?.pf, 3),
    etaPct: f(d?.etaPct, 2),
  };
}
