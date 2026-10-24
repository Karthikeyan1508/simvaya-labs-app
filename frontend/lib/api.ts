import type { CalcResult, ExperimentDef, ObservationRow, Readings } from './types';

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
const PATH = '/experiments/pelton-wheel';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, init);
  if (!res.ok) throw new Error(`${res.status} ${path}`);
  return (await res.json()) as T;
}

function post<T>(path: string, body: unknown): Promise<T> {
  return request<T>(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

export const getExperiment = () => request<ExperimentDef>(PATH);

export const simulateRig = (body: {
  pumpOn: boolean;
  nozzleStep: number;
  deadWeightKg: number;
  springKg: number;
}) => post<Readings>(`${PATH}/simulate`, body);

export const calculateRow = (body: {
  deadWeightKg: number;
  springKg: number;
  p1: number;
  p2: number;
  pp: number;
  speedRpm: number;
}) => post<CalcResult>(`${PATH}/calculate`, body);

export const runSweep = (body: { nozzleStep: number; points: number }) =>
  post<ObservationRow[]>(`${PATH}/sweep`, body);
