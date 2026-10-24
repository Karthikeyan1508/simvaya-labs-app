// Simplified model of a three-phase induction motor load test. Nameplate values are illustrative.
// Pure functions only: no Nest imports. simulate() returns finite numbers; derive() returns null where a value cannot be computed.
import { BRAKE, NAMEPLATE } from './induction-motor.content';
import type { DerivedReadings, RawReadings, SimReadings, SimWarning } from './induction-motor.types';

export const G = 9.81; // m/s2

// Synchronous speed Ns = 120 f / P, in rpm.
export function syncSpeedRpm(frequencyHz: number, poles: number): number {
  return poles > 0 ? (120 * frequencyHz) / poles : 0;
}

export const SYNC_RPM = syncSpeedRpm(NAMEPLATE.frequencyHz, NAMEPLATE.poles); // 1500
export const LINE_VOLTAGE_V = NAMEPLATE.lineVoltageV;
export const RATED_CURRENT_A = NAMEPLATE.ratedCurrentA;
export const RATED_POWER_W = NAMEPLATE.ratedPowerKw * 1000;
export const RATED_SPEED_RPM = NAMEPLATE.ratedSpeedRpm;
export const T_RATED = (60 * RATED_POWER_W) / (2 * Math.PI * RATED_SPEED_RPM); // N m, about 14.6
export const T_FW = 0.4; // friction and windage torque, N m
export const S_FL = (SYNC_RPM - RATED_SPEED_RPM) / SYNC_RPM; // rated slip, 0.04
export const P_NL = 180; // no-load (iron and friction) loss, W
export const K_LOSS = 4.3e-5; // load-dependent loss coefficient, W^-1
export const OVERLOAD_TORQUE_FACTOR = 1.25; // overload_torque above 1.25 x rated torque
export const RATED_CURRENT_TOLERANCE = 1.02; // over_rated_current only above 2 % over the nameplate, a measurement allowance
export const MAX_LOAD_KG = 40;
export const PF_MAX_VALID = 1.05; // a power factor above this means the readings are wrong
export const EFFECTIVE_RADIUS_M = BRAKE.radiusM + BRAKE.beltThicknessM / 2; // R + t/2
export const TARE_KG = BRAKE.tareKg; // S2 at no load

const finiteOrNull = (x: number): number | null => (Number.isFinite(x) ? x : null);
const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));

// Shaft torque from the spring balances: T = g (S1 - S2)(R + t/2), S in kg, T in N m.
export function shaftTorqueNm(s1Kg: number, s2Kg: number): number {
  return G * (s1Kg - s2Kg) * EFFECTIVE_RADIUS_M;
}

// Power factor against output ratio x = P_out / P_rated.
export function powerFactorAt(x: number): number {
  return 0.2 + 0.65 * (1 - Math.exp(-2.5 * Math.max(0, x)));
}

function stoppedReadings(): SimReadings {
  return {
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
}

// Readings for the motor at a given brake load. Stopped, or supply off, gives all zeros.
export function simulate(loadKg: number, running: boolean, supplyOn: boolean): SimReadings {
  if (!running || !supplyOn) return stoppedReadings();

  const load = clamp(Number.isFinite(loadKg) ? loadKg : 0, 0, MAX_LOAD_KG);
  const s1Kg = TARE_KG + load;
  const s2Kg = TARE_KG;
  const torqueNm = shaftTorqueNm(s1Kg, s2Kg);
  const tDev = torqueNm + T_FW;
  const tDevRated = T_RATED + T_FW;
  const slip = S_FL * (tDev / tDevRated);
  const speedRpm = SYNC_RPM * (1 - slip);
  const poutW = (2 * Math.PI * speedRpm * torqueNm) / 60;
  const x = poutW / RATED_POWER_W;
  const pinW = poutW + P_NL + K_LOSS * poutW * poutW;
  const pf = powerFactorAt(x);
  const denom = Math.sqrt(3) * LINE_VOLTAGE_V * pf;
  const IL = denom > 0 ? pinW / denom : 0;
  const phi = Math.acos(pf);
  const VL = LINE_VOLTAGE_V;
  const W1 = VL * IL * Math.cos(Math.PI / 6 - phi);
  const W2 = VL * IL * Math.cos(Math.PI / 6 + phi);

  const warnings: SimWarning[] = [];
  if (IL > RATED_CURRENT_A * RATED_CURRENT_TOLERANCE) warnings.push('over_rated_current');
  if (torqueNm > OVERLOAD_TORQUE_FACTOR * T_RATED) warnings.push('overload_torque');

  return {
    running: true,
    VL,
    IL,
    W1,
    W2,
    pinW,
    pf,
    speedRpm,
    syncRpm: SYNC_RPM,
    slipPct: 100 * slip,
    torqueNm,
    poutW,
    etaPct: pinW > 0 ? (100 * poutW) / pinW : 0,
    s1Kg,
    s2Kg,
    warnings,
  };
}

// Values calculated from one set of raw observations. Any value that cannot be computed is null.
export function derive(raw: RawReadings): DerivedReadings {
  const issues: string[] = [];
  const named: [string, number][] = [
    ['VL', raw.VL],
    ['IL', raw.IL],
    ['W1', raw.W1],
    ['W2', raw.W2],
    ['S1', raw.s1Kg],
    ['S2', raw.s2Kg],
    ['speed', raw.speedRpm],
  ];
  const nonFinite = named.filter(([, v]) => !Number.isFinite(v)).map(([k]) => k);
  if (nonFinite.length) issues.push(`Not a finite number: ${nonFinite.join(', ')}.`);
  if (Number.isFinite(raw.VL) && raw.VL <= 0) issues.push('VL must be above zero.');
  if (Number.isFinite(raw.IL) && raw.IL <= 0) issues.push('IL must be above zero.');

  const pinW = finiteOrNull(raw.W1 + raw.W2); // signed: a negative wattmeter stays negative
  if (pinW === null && !nonFinite.length) issues.push('W1 + W2 is out of range.');
  if (pinW !== null && pinW <= 0) issues.push('W1 + W2 must be above zero: check the wattmeter readings.');
  if (Number.isFinite(raw.s1Kg) && Number.isFinite(raw.s2Kg) && raw.s1Kg < raw.s2Kg) {
    issues.push('S1 must not be below S2: check the spring balances.');
  }
  const voltageOk = Number.isFinite(raw.VL) && raw.VL > 0;
  const currentOk = Number.isFinite(raw.IL) && raw.IL > 0;
  const pf =
    pinW !== null && pinW > 0 && voltageOk && currentOk ? finiteOrNull(pinW / (Math.sqrt(3) * raw.VL * raw.IL)) : null;
  if (pf !== null && pf > PF_MAX_VALID) {
    issues.push(`Power factor ${pf.toFixed(3)} is above ${PF_MAX_VALID}: check the wattmeter readings, VL and IL.`);
  }

  const speedOk = Number.isFinite(raw.speedRpm);
  if (speedOk && raw.speedRpm > SYNC_RPM) {
    issues.push(`Speed ${raw.speedRpm} rpm is above synchronous speed (${SYNC_RPM} rpm): check the tachometer.`);
  }

  const torqueNm =
    Number.isFinite(raw.s1Kg) && Number.isFinite(raw.s2Kg) ? finiteOrNull(shaftTorqueNm(raw.s1Kg, raw.s2Kg)) : null;
  const slipPct = speedOk && SYNC_RPM > 0 ? finiteOrNull((100 * (SYNC_RPM - raw.speedRpm)) / SYNC_RPM) : null;
  const poutW = torqueNm !== null && speedOk ? finiteOrNull((2 * Math.PI * raw.speedRpm * torqueNm) / 60) : null;
  const etaPct = poutW !== null && pinW !== null && pinW > 0 ? finiteOrNull((100 * poutW) / pinW) : null;

  return {
    syncRpm: SYNC_RPM,
    slipPct,
    torqueNm,
    poutW,
    pinW,
    pf,
    etaPct,
    valid: issues.length === 0,
    issues,
  };
}
