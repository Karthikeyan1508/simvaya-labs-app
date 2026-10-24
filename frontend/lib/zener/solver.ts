// DC operating point of the shunt Zener regulator: Vs -> Rs -> node Vout, Zener (cathode at Vout, anode at ground)
// in reverse bias across the load RL. Ideal Zener: Vout is held at Vz while the Zener conducts.

export const RS_OHM = 220; // series resistor, manual apparatus
export const VZ_V = 5.1; // 1N4733A nominal Zener voltage (+/-5 %)
export const PZ_MAX_W = 1; // 1N4733A maximum power dissipation
export const RS_RATING_W = 0.25; // resistor rating from the manual apparatus list
export const VS_MAX_V = 15; // supply range, manual apparatus list
// shortcut: assumed minimum Zener current for regulation (datasheet knee not confirmed), verify against the 1N4728A-1N4764A datasheet
export const IZ_MIN_A = 0.005;

export interface Circuit {
  vs: number;
  rs: number;
  vz: number;
  rl: number | null; // null = no load (open)
}

export interface OperatingPoint {
  ok: true;
  vOut: number;
  iZ: number; // Zener current, A (0 when not conducting)
  iL: number; // load current, A
  iS: number; // total supply current through Rs, A
  pZ: number; // Zener power, W
  pRs: number; // series resistor power, W
  regulating: boolean; // Zener in breakdown, Vout held at Vz
  warnings: string[];
}

export type SolveResult = OperatingPoint | { ok: false; messages: string[] };

const finitePos = (x: number) => Number.isFinite(x) && x > 0;

export function validate(c: Circuit): string[] {
  const m: string[] = [];
  if (!Number.isFinite(c.vs) || c.vs < 0 || c.vs > VS_MAX_V) m.push(`Input voltage must be between 0 and ${VS_MAX_V} V.`);
  if (!finitePos(c.rs)) m.push('Series resistor must be a positive value.');
  if (!finitePos(c.vz)) m.push('Zener voltage must be a positive value.');
  if (c.rl !== null && !finitePos(c.rl)) m.push('Load resistor must be a positive value, or no load.');
  return m;
}

export function solve(c: Circuit): SolveResult {
  const messages = validate(c);
  if (messages.length) return { ok: false, messages };

  const { vs, rs, vz, rl } = c;
  // Open-circuit output of the divider. If it stays below Vz the Zener is off and the divider sets Vout.
  const vOpen = rl === null ? vs : (vs * rl) / (rs + rl);
  const regulating = vOpen > vz;

  const vOut = regulating ? vz : vOpen;
  const iL = rl === null ? 0 : vOut / rl;
  const iZ = regulating ? (vs - vz) / rs - iL : 0;
  const iS = (vs - vOut) / rs;
  const pZ = vOut * iZ;
  const pRs = iS * iS * rs;

  const warnings: string[] = [];
  if (pZ > PZ_MAX_W) warnings.push(`Zener power ${pZ.toFixed(2)} W is above its ${PZ_MAX_W} W rating.`);
  if (pRs > RS_RATING_W) warnings.push(`Series resistor dissipates ${pRs.toFixed(2)} W, above its ${RS_RATING_W} W rating.`);
  if (!regulating) warnings.push('Input is too low for the Zener to conduct. Vout follows the divider and is not regulated.');
  else if (iZ < IZ_MIN_A) warnings.push('Zener current is below the regulating range. Vout is only weakly held at Vz.');

  return { ok: true, vOut, iZ, iL, iS, pZ, pRs, regulating, warnings };
}

// Sweep of the input voltage at one load, for the graphs.
export function sweepVs(base: Omit<Circuit, 'vs'>, from: number, to: number, step: number): { vs: number; op: OperatingPoint }[] {
  const out: { vs: number; op: OperatingPoint }[] = [];
  for (let vs = from; vs <= to + 1e-9; vs += step) {
    const r = solve({ ...base, vs });
    if (r.ok) out.push({ vs: Math.round(vs * 1000) / 1000, op: r });
  }
  return out;
}
