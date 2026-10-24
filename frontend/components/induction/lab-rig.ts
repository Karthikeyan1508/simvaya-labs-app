'use client';

import { useCallback, useEffect, useState } from 'react';
import type { SimReadings } from '@/lib/induction';
import { LOAD_MAX_KG } from '@/lib/induction';
import { simulateInduction } from '@/lib/induction-api';

export const LOAD_STEPS = [0.5, 1, 2] as const;
export type LoadStep = (typeof LOAD_STEPS)[number];

// Readings before the first answer, and whenever the motor is stopped. Matches the backend's stopped state.
export const ZERO_SIM: SimReadings = {
  running: false,
  VL: 0,
  IL: 0,
  W1: 0,
  W2: 0,
  pinW: 0,
  pf: 0,
  speedRpm: 0,
  syncRpm: 1500,
  slipPct: 0,
  torqueNm: 0,
  poutW: 0,
  etaPct: 0,
  s1Kg: 0,
  s2Kg: 0,
  warnings: [],
};

const sameSim = (a: SimReadings, b: SimReadings) => JSON.stringify(a) === JSON.stringify(b);
const round2 = (v: number) => Math.round(v * 100) / 100;

// The bench controls and the simulated readings. Emergency stop blocks everything until reset; pause freezes the rig.
export function useRig({ armed, onError }: { armed: boolean; onError: (message: string) => void }) {
  const [supplyOn, setSupplyOn] = useState(false);
  const [running, setRunning] = useState(false);
  const [emergency, setEmergency] = useState(false);
  const [paused, setPaused] = useState(false);
  const [loadKg, setLoadKg] = useState(0);
  const [step, setStep] = useState<LoadStep>(1);
  const [sim, setSim] = useState<SimReadings>(ZERO_SIM);
  const [viewToken, setViewToken] = useState(0);

  // Asks the model once after each change, and every 1.5 s while the motor runs. Equal answers do not re-render.
  useEffect(() => {
    if (paused) return;
    let cancelled = false;
    const ask = () => {
      simulateInduction({ loadKg, running: running && !emergency, supplyOn: supplyOn && !emergency })
        .then((r) => {
          if (!cancelled) setSim((prev) => (sameSim(prev, r) ? prev : r));
        })
        .catch((e: Error) => {
          if (!cancelled) onError(e.message);
        });
    };
    const first = window.setTimeout(ask, 120);
    const every = running ? window.setInterval(ask, 1500) : undefined;
    return () => {
      cancelled = true;
      window.clearTimeout(first);
      if (every !== undefined) window.clearInterval(every);
    };
  }, [loadKg, running, supplyOn, emergency, paused, onError]);

  const canSupply = armed && !emergency && !paused;
  const canStart = supplyOn && armed && !running && !emergency && !paused;
  const canLoad = !emergency && !paused;

  const setSupply = useCallback(
    (on: boolean) => {
      if (on) {
        if (canSupply) setSupplyOn(true);
        return;
      }
      setSupplyOn(false);
      setRunning(false);
    },
    [canSupply],
  );

  const start = useCallback(() => {
    if (canStart) setRunning(true);
  }, [canStart]);

  const stop = useCallback(() => setRunning(false), []);

  const eStop = useCallback(() => {
    setEmergency(true);
    setPaused(false);
    setRunning(false);
    setSupplyOn(false);
  }, []);

  const togglePause = useCallback(() => {
    if (!emergency && (running || paused)) setPaused((p) => !p);
  }, [emergency, running, paused]);

  const bump = useCallback(
    (dir: 1 | -1) => {
      if (!canLoad) return;
      setLoadKg((l) => Math.min(LOAD_MAX_KG, Math.max(0, round2(l + dir * step))));
    },
    [canLoad, step],
  );

  const release = useCallback(() => {
    if (canLoad) setLoadKg(0);
  }, [canLoad]);

  const resetView = useCallback(() => setViewToken((v) => v + 1), []);

  const reset = useCallback(() => {
    setEmergency(false);
    setPaused(false);
    setRunning(false);
    setSupplyOn(false);
    setLoadKg(0);
    setViewToken((v) => v + 1);
  }, []);

  return {
    sim,
    supplyOn,
    running,
    emergency,
    paused,
    loadKg,
    step,
    setStep,
    viewToken,
    canSupply,
    canStart,
    canLoad,
    setSupply,
    start,
    stop,
    eStop,
    togglePause,
    bump,
    release,
    resetView,
    reset,
  };
}

export type RigApi = ReturnType<typeof useRig>;
