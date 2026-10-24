'use client';

import { AlertTriangle } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { ViewName } from '@/components/pelton/views';
import { VoiceAssistant } from '@/components/voice/voice-assistant';
import { fetchRecordings, logActivity, saveRecording } from '@/lib/account';
import { calculateRow, getExperiment, runSweep, simulateRig } from '@/lib/api';
import { cn } from '@/lib/utils';
import { HANGER_KG, STEP_VIEW, autoDone } from '@/lib/lab-logic';
import { POSTTEST, PRETEST } from '@/lib/quiz';
import { SECTIONS, isSectionId, type SectionId } from '@/lib/sections';
import type { ExperimentDef, ObservationRow, Readings, RigState } from '@/lib/types';
import type { LabBridge } from '@/lib/voice-tools';
import { AimSection } from './sections/aim-section';
import { CalculationsSection } from './sections/calculations-section';
import { FeedbackSection } from './sections/feedback-section';
import { ProcedureSection } from './sections/procedure-section';
import { QuizSection } from './sections/quiz-section';
import { ReferencesSection } from './sections/references-section';
import { SimulationSection } from './sections/simulation-section';
import { TheorySection } from './sections/theory-section';
import { NavBar, NavStatus } from './nav-bar';
import { ShaderBackground } from './shader-background';
import { Sidebar } from './sidebar';
import { MobileNav } from './mobile-nav';

const EMPTY_READINGS: Readings = { p1: 0, p2: 0, pp: 0, speedRpm: 0, springKg: 0 };

export function LabPage() {
  const [exp, setExp] = useState<ExperimentDef | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [section, setSection] = useState<SectionId>('aim');
  const [menuOpen, setMenuOpen] = useState(false);

  const [pumpOn, setPumpOn] = useState(false);
  const [nozzleStep, setNozzleStep] = useState(8);
  const [deadWeightKg, setDeadWeightKg] = useState(0);
  const [springKg, setSpringKg] = useState(0);
  const [readings, setReadings] = useState<Readings>(EMPTY_READINGS);

  const [stepIndex, setStepIndex] = useState(0);
  const [manualDone, setManualDone] = useState<number[]>([]);
  const [playing, setPlaying] = useState(false);
  const [view, setView] = useState<{ name: ViewName; nonce: number }>({ name: 'iso', nonce: 0 });
  const [explode, setExplode] = useState(0);
  const [showLabels, setShowLabels] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);
  // Set by the voice assistant. It replaces the step's highlight until cleared or the voice moves to another step.
  const [voiceHighlight, setVoiceHighlight] = useState<string[] | null>(null);

  const [rows, setRows] = useState<ObservationRow[]>([]);
  const [activeRow, setActiveRow] = useState<number | null>(null);
  const [tab, setTab] = useState('observations');
  const [quiz, setQuiz] = useState<{ pre: number | null; post: number | null }>({ pre: null, post: null });
  const logged = useRef(false);
  const attempted = useRef(false);

  // The current section lives in the URL hash so a refresh keeps you in place. The hash is written only
  // on a choice, so the restore read never races a write.
  useEffect(() => {
    const h = window.location.hash.slice(1);
    if (isSectionId(h)) setSection(h);
  }, []);

  const choose = (id: SectionId) => {
    setSection(id);
    window.history.replaceState(null, '', `#${id}`);
  };

  useEffect(() => {
    getExperiment().then(setExp).catch((e: Error) => setError(e.message));
  }, []);

  // Opening the lab logs a visit and loads the readings already saved on the account.
  useEffect(() => {
    if (logged.current) return;
    logged.current = true;
    logActivity('experiment_opened', 'pelton-wheel').catch(() => undefined);
    fetchRecordings('pelton-wheel')
      .then((list) => setRows(list.map((r) => r.data).reverse()))
      .catch((e: Error) => setError(e.message));
  }, []);

  // The first pump start in a visit counts as one attempt.
  useEffect(() => {
    if (!pumpOn || attempted.current) return;
    attempted.current = true;
    logActivity('attempt_started', 'pelton-wheel').catch(() => undefined);
  }, [pumpOn]);

  // Re-simulate after control changes, debounced.
  useEffect(() => {
    let cancelled = false;
    const id = window.setTimeout(() => {
      simulateRig({ pumpOn, nozzleStep, deadWeightKg, springKg })
        .then((r) => {
          if (!cancelled) setReadings(r);
        })
        .catch((e: Error) => {
          if (!cancelled) setError(e.message);
        });
    }, 120);
    return () => {
      cancelled = true;
      window.clearTimeout(id);
    };
  }, [pumpOn, nozzleStep, deadWeightKg, springKg]);

  // Entering a step applies its setup and camera view.
  useEffect(() => {
    if (!exp) return;
    const step = exp.procedure[stepIndex];
    if (step.setup?.pumpOn !== undefined) setPumpOn(step.setup.pumpOn);
    setView((v) => ({ name: STEP_VIEW[stepIndex], nonce: v.nonce + 1 }));
    if (stepIndex === exp.procedure.length - 1) setPlaying(false);
  }, [exp, stepIndex]);

  useEffect(() => {
    if (!playing || !exp) return;
    const id = window.setInterval(() => {
      setStepIndex((i) => Math.min(i + 1, exp.procedure.length - 1));
    }, 2500);
    return () => window.clearInterval(id);
  }, [playing, exp]);

  const state: RigState = {
    pumpOn,
    nozzleStep,
    deadWeightKg,
    springKg,
    speedRpm: readings.speedRpm,
    p1: readings.p1,
    p2: readings.p2,
    pp: readings.pp,
  };

  const total = exp?.procedure.length ?? 9;
  const done = Array.from({ length: total }, (_, i) => manualDone.includes(i) || autoDone(i, state, rows.length));
  const doneCount = done.filter(Boolean).length;
  const netLoadKg = deadWeightKg + HANGER_KG - springKg;

  const toggleDone = (i: number) => setManualDone((d) => (d.includes(i) ? d.filter((x) => x !== i) : [...d, i]));

  // Each saved reading also logs a row_recorded activity on the server.
  const persist = (row: ObservationRow) => saveRecording('pelton-wheel', row).catch((e: Error) => setError(e.message));

  const recordRow = async () => {
    if (!pumpOn || busy) return;
    const reading = { ...readings };
    setBusy(true);
    try {
      const calc = await calculateRow({
        deadWeightKg,
        springKg,
        p1: reading.p1,
        p2: reading.p2,
        pp: reading.pp,
        speedRpm: reading.speedRpm,
      });
      const row: ObservationRow = {
        deadWeightKg,
        springKg,
        p1: reading.p1,
        p2: reading.p2,
        pp: reading.pp,
        speedRpm: reading.speedRpm,
        ...calc,
      };
      const next = [...rows, row];
      setRows(next);
      setActiveRow(next.length - 1);
      persist(row);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const autoRun = async () => {
    if (busy) return;
    logActivity('sweep_run', 'pelton-wheel').catch(() => undefined);
    setBusy(true);
    try {
      const res = await runSweep({ nozzleStep, points: 12 });
      const next = [...rows, ...res];
      setRows(next);
      setActiveRow(next.length - 1);
      setTab('observations');
      // In order, so the saved list reloads in the same sequence.
      for (const row of res) await persist(row);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const clearRows = () => {
    setRows([]);
    setActiveRow(null);
  };

  // Keyboard: Space pump, 1-8 nozzle, arrows steps, R record, A sweep.
  const keys = useRef<(e: KeyboardEvent) => void>(() => {});
  keys.current = (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const t = e.target as HTMLElement | null;
    if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
    if (e.key === ' ') {
      if (t && (t.tagName === 'BUTTON' || t.getAttribute('role') === 'slider')) return;
      e.preventDefault();
      setPumpOn((p) => !p);
    } else if (/^[1-8]$/.test(e.key)) setNozzleStep(Number(e.key));
    else if (e.key === 'ArrowRight') setStepIndex((i) => Math.min(i + 1, total - 1));
    else if (e.key === 'ArrowLeft') setStepIndex((i) => Math.max(i - 1, 0));
    else if (e.key.toLowerCase() === 'r') recordRow();
    else if (e.key.toLowerCase() === 'a') autoRun();
  };
  useEffect(() => {
    const handler = (e: KeyboardEvent) => keys.current(e);
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const bestIndex = rows.reduce((bi, r, i) => (r.ipKw > 0 && (bi < 0 || r.etaPct > rows[bi].etaPct) ? i : bi), -1);
  const best = bestIndex >= 0 ? rows[bestIndex] : null;

  const step = exp?.procedure[stepIndex];
  const selectedIndex = exp?.components.findIndex((c) => c.id === selected) ?? -1;
  const selectedInfo = selectedIndex >= 0 ? exp?.components[selectedIndex] : undefined;

  const badges: Partial<Record<SectionId, string>> = {
    pretest: quiz.pre !== null ? `${quiz.pre}/${PRETEST.length}` : undefined,
    procedure: `${doneCount}/${total}`,
    calculations: rows.length ? `${rows.length} rows` : undefined,
    posttest: quiz.post !== null ? `${quiz.post}/${POSTTEST.length}` : undefined,
  };

  const lab: LabBridge = {
    exp,
    pumpOn,
    nozzleStep,
    deadWeightKg,
    springKg,
    netLoadKg,
    readings,
    setExplode,
    setView: (name) => setView((v) => ({ name, nonce: v.nonce + 1 })),
    setSelected,
    setVoiceHighlight,
    setPumpOn,
    setNozzleStep,
    goToStep: (i) => {
      setStepIndex(i);
      setVoiceHighlight(null);
    },
    showScene: () => choose('simulation'),
  };

  const renderSection = () => {
    switch (section) {
      case 'aim':
        return (
          <AimSection aim={exp?.aim ?? ''} apparatus={exp?.apparatus ?? []} onStart={() => choose('simulation')} />
        );
      case 'theory':
        return <TheorySection />;
      case 'pretest':
        return (
          <QuizSection
            title="Pretest"
            subtitle="A quick check before you start. Answer all five, then submit."
            questions={PRETEST}
            onScore={(s) => setQuiz((q) => ({ ...q, pre: s }))}
          />
        );
      case 'procedure':
        return (
          <ProcedureSection
            steps={exp?.procedure ?? []}
            stepIndex={stepIndex}
            done={done}
            components={exp?.components ?? []}
            onToggle={toggleDone}
            onOpen={(i) => {
              setStepIndex(i);
              choose('simulation');
            }}
          />
        );
      case 'simulation':
        return (
          <SimulationSection
            state={state}
            readings={readings}
            components={exp?.components ?? []}
            highlight={voiceHighlight ?? step?.highlight ?? []}
            selected={selected}
            onSelect={setSelected}
            explode={explode}
            onExplode={setExplode}
            showLabels={showLabels}
            onLabels={setShowLabels}
            view={view}
            onView={(name) => setView((v) => ({ name, nonce: v.nonce + 1 }))}
            stepIndex={stepIndex}
            steps={exp?.procedure ?? []}
            done={done}
            onStep={setStepIndex}
            playing={playing}
            onPlay={() => setPlaying((p) => !p)}
            onPrev={() => setStepIndex((i) => Math.max(0, i - 1))}
            onNext={() => setStepIndex((i) => Math.min(total - 1, i + 1))}
            control={{
              pumpOn,
              onPump: setPumpOn,
              nozzleStep,
              onNozzle: setNozzleStep,
              deadWeightKg,
              onDeadWeight: setDeadWeightKg,
              springKg,
              onSpring: setSpringKg,
              netLoadKg,
              busy,
              onRecord: recordRow,
              onAutoRun: autoRun,
            }}
          />
        );
      case 'calculations':
        return (
          <CalculationsSection
            tab={tab}
            onTab={setTab}
            rows={rows}
            activeRow={activeRow}
            onSelect={setActiveRow}
            onClear={clearRows}
            bestIndex={bestIndex}
            best={best}
          />
        );
      case 'posttest':
        return (
          <QuizSection
            title="Posttest"
            subtitle="Check what you learned from the simulation and the results."
            questions={POSTTEST}
            onScore={(s) => setQuiz((q) => ({ ...q, post: s }))}
          />
        );
      case 'references':
        return <ReferencesSection />;
      case 'feedback':
        return <FeedbackSection />;
    }
  };

  return (
    <div className="relative h-dvh overflow-hidden">
      <ShaderBackground />

      <div className="relative z-10 flex h-full flex-col gap-3 p-3 md:p-4">
        <NavBar
          title={exp?.title ?? 'Pelton wheel turbine'}
          progress={total ? doneCount / total : 0}
          onMenu={() => setMenuOpen(true)}
          status={
            <NavStatus>
              <div className="flex items-center gap-2 px-3 py-1.5">
                <span className={cn('size-1.5 rounded-full', pumpOn ? 'led bg-primary' : 'bg-muted-foreground/40')} />
                <span className={cn(pumpOn ? 'text-foreground' : 'text-muted-foreground')}>
                  {pumpOn ? 'Pump on' : 'Pump off'}
                </span>
              </div>
              <div className="num px-3 py-1.5 text-foreground">
                {Math.round(readings.speedRpm)}
                <span className="ml-1 text-muted-foreground">rpm</span>
              </div>
              <div className="num px-3 py-1.5 text-muted-foreground">
                <span className="text-foreground">{doneCount}</span>/{total} steps
              </div>
            </NavStatus>
          }
        />

        <div className="flex min-h-0 flex-1 flex-col gap-3 lg:flex-row">
          <Sidebar sections={SECTIONS} active={section} onSelect={choose} badges={badges} />
          <MobileNav
            open={menuOpen}
            onOpenChange={setMenuOpen}
            sections={SECTIONS}
            active={section}
            onSelect={choose}
            badges={badges}
          />

          <main className="glass min-h-0 min-w-0 flex-1 overflow-y-auto rounded-lg p-5 md:p-7">
            {error && (
              <div className="mb-5 flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                <AlertTriangle className="size-4 shrink-0" />
                Backend problem: {error}. Check it is running on port 3001.
              </div>
            )}
            {renderSection()}
          </main>
        </div>
      </div>

      <VoiceAssistant lab={lab} />
    </div>
  );
}
