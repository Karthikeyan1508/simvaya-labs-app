'use client';

import { AlertTriangle } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSession } from '@/components/app/session-provider';
import { MobileNav } from '@/components/lab/mobile-nav';
import { NavBar, NavStatus } from '@/components/lab/nav-bar';
import { Sidebar } from '@/components/lab/sidebar';
import { AimSection } from '@/components/lab/sections/aim-section';
import { FeedbackSection } from '@/components/lab/sections/feedback-section';
import { ReferencesSection } from '@/components/lab/sections/references-section';
import { OralSelfAssessment } from '@/components/viva/oral-self-assessment';
import { VoiceAssistant } from '@/components/voice/voice-assistant';
import { logActivity } from '@/lib/account';
import { isComponentId, loadFraction, type ComponentId, type ExperimentInfo } from '@/lib/induction';
import { getInductionExperiment } from '@/lib/induction-api';
import { EEE_SECTIONS, isEeeSectionId, type EeeSectionId } from '@/lib/sections';
import { cn } from '@/lib/utils';
import { buildInductionPrompt, buildInductionVoiceTools, INDUCTION_FIRST_MESSAGE, type InductionVoiceBridge } from '@/lib/voice-induction';
import { useRig } from './lab-rig';
import { useObservationRows } from './lab-rows';
import { LabSimulation, type ViewMode } from './lab-simulation';
import { GraphsSection } from './graphs-section';
import { ObservationsSection } from './observations-section';
import { ProcedureSection, STAGE_HIGHLIGHT, currentStageId, stageFlags } from './procedure-stages';
import { CalculationsSection } from './sections-calculations';
import { TheorySection } from './sections-theory';
import { VivaSection } from './viva-section';

const NO_PARTS: ComponentId[] = [];
const TICKS_KEY = 'simvaya.induction.safetyTicks';

const OBJECTIVES = [
  'Measure line voltage, line current, input power and speed at no load and at several loads.',
  'Calculate slip, torque, output power, power factor and efficiency for each observation.',
  'Plot efficiency, power factor, speed, current, torque and slip against output power.',
];

// Shell for the induction motor load test: the bench state, the observation rows and the procedure progress.
export function LabInduction() {
  const { user } = useSession();
  // The oral self-assessment is for students only.
  const sections = user?.role === 'student' ? EEE_SECTIONS : EEE_SECTIONS.filter((s) => s.id !== 'oral');
  const [exp, setExp] = useState<ExperimentInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [section, setSection] = useState<EeeSectionId>('aim');
  const [visited, setVisited] = useState<EeeSectionId[]>([]);
  const [menuOpen, setMenuOpen] = useState(false);
  // The safety ticks are kept for this tab, so a reload does not lock the rig again.
  const [ticks, setTicks] = useState<boolean[]>(() => {
    try {
      return JSON.parse(window.sessionStorage.getItem(TICKS_KEY) ?? '[]') as boolean[];
    } catch {
      return [];
    }
  });
  useEffect(() => {
    try {
      window.sessionStorage.setItem(TICKS_KEY, JSON.stringify(ticks));
    } catch {
      /* storage blocked: the ticks last until reload */
    }
  }, [ticks]);
  const [view, setViewMode] = useState<ViewMode>('scene');
  const [circuitSeen, setCircuitSeen] = useState(false);
  const [cutaway, setCutaway] = useState(false);
  const [part, setPart] = useState<ComponentId | null>(null);
  const [partsSeen, setPartsSeen] = useState<ComponentId[]>([]);
  const [vivaScore, setVivaScore] = useState<number | null>(null);
  // Set by the voice assistant. It replaces the stage's highlight until cleared or the voice moves to another stage.
  const [voiceHighlight, setVoiceHighlight] = useState<ComponentId[] | null>(null);
  const logged = useRef(false);

  const safetyChecks = exp?.safetyChecks ?? [];
  const ticked = safetyChecks.filter((_, i) => ticks[i]).length;
  const armed = safetyChecks.length > 0 && ticked === safetyChecks.length;

  const rig = useRig({ armed, onError: setError });
  const obs = useObservationRows({ onError: setError });

  // The section lives in the URL hash. The hash is written only on a choice, so the restore read never races a write.
  useEffect(() => {
    const h = window.location.hash.slice(1);
    if (isEeeSectionId(h)) setSection(h);
  }, []);

  const choose = useCallback((id: EeeSectionId) => {
    setSection(id);
    window.history.replaceState(null, '', `#${id}`);
  }, []);

  useEffect(() => {
    setVisited((v) => (v.includes(section) ? v : [...v, section]));
  }, [section]);

  useEffect(() => {
    getInductionExperiment().then(setExp).catch((e: Error) => setError(e.message));
  }, []);

  // Opening the lab logs one visit.
  useEffect(() => {
    if (logged.current) return;
    logged.current = true;
    logActivity('experiment_opened', 'induction-motor').catch(() => undefined);
  }, []);

  const toggleTick = (i: number) =>
    setTicks((t) => {
      const next = [...t];
      next[i] = !next[i];
      return next;
    });

  const pick = useCallback((id: ComponentId | null) => {
    setPart(id);
    if (id) setPartsSeen((s) => (s.includes(id) ? s : [...s, id]));
  }, []);

  const setView = (v: ViewMode) => {
    setViewMode(v);
    if (v === 'circuit') setCircuitSeen(true);
  };

  // Procedure progress comes from the student's own work: rows captured, the rig state and what they opened.
  const calcRows = obs.rows.map((r) => ({ r, d: obs.derivedOf(r) }));
  const noLoad = calcRows.some(({ d }) => d?.valid && d.torqueNm !== null && d.torqueNm < 0.05);
  const loadedRows = calcRows.filter(({ d }) => d?.valid && d.torqueNm !== null && d.torqueNm >= 0.5).length;
  const flags = stageFlags({
    theoryRead: visited.includes('theory'),
    partsSeen: partsSeen.length >= 3,
    circuitSeen,
    safetyAll: armed,
    noLoad,
    loaded: loadedRows >= 3,
    released: loadedRows > 0 && rig.loadKg === 0 && !rig.running,
    analysed: visited.includes('graphs') && visited.includes('calculations'),
    viva: vivaScore !== null,
    exported: obs.exported,
  });
  const stages = exp?.stages ?? [];
  const doneCount = stages.filter((s) => flags[s.id]).length;
  const current = currentStageId(stages, flags);
  const highlight = current ? STAGE_HIGHLIGHT[current] : NO_PARTS;
  const lf = exp ? loadFraction(rig.loadKg, exp.brake, exp.nameplate) : 0;

  const canCapture = rig.running && !rig.paused && !rig.emergency && rig.supplyOn;
  const captureHint = rig.emergency
    ? 'Reset the rig after the emergency stop to capture readings.'
    : rig.paused
      ? 'Resume the motor to capture a reading.'
      : 'Start the motor to capture a reading.';

  const badges: Partial<Record<EeeSectionId, string>> = {
    procedure: stages.length ? `${doneCount}/${stages.length}` : undefined,
    observations: obs.rows.length ? `${obs.rows.length} rows` : undefined,
    viva: vivaScore !== null ? `${vivaScore} right` : undefined,
  };

  const runLabel = rig.emergency ? 'E-stop' : rig.paused ? 'Paused' : rig.running ? 'Running' : 'Stopped';

  const voicePrompt = useMemo(() => (exp ? buildInductionPrompt(exp) : null), [exp]);
  const voice: InductionVoiceBridge = {
    exp,
    parts: exp?.components ?? null,
    prompt: voicePrompt,
    firstMessage: INDUCTION_FIRST_MESSAGE,
    setVoiceHighlight: (ids) => setVoiceHighlight(ids?.length ? ids.filter(isComponentId) : null),
    armed,
    rig,
    view,
    setView,
    setCutaway,
    setPart: pick,
    showSimulation: () => choose('simulation'),
    setLoad: rig.setLoad,
    goToStage: () => {
      setVoiceHighlight(null);
      choose('procedure');
    },
  };

  const status = (
    <NavStatus>
      <div className="flex items-center gap-2 px-3 py-1.5">
        <span className={cn('size-1.5 rounded-full', rig.supplyOn ? 'led bg-primary' : 'bg-muted-foreground/40')} />
        <span className={cn(rig.supplyOn ? 'text-foreground' : 'text-muted-foreground')}>
          {rig.supplyOn ? 'Supply on' : 'Supply off'}
        </span>
      </div>
      <div
        className={cn(
          'px-3 py-1.5',
          rig.emergency ? 'text-destructive' : rig.running ? 'text-foreground' : 'text-muted-foreground',
        )}
      >
        {runLabel}
      </div>
      <div className="num px-3 py-1.5 text-muted-foreground">
        Load <span className="text-foreground">{Math.round(lf * 100)}%</span>
      </div>
      <div className="num px-3 py-1.5 text-muted-foreground">
        <span className="text-foreground">{doneCount}</span>/{stages.length} steps
      </div>
    </NavStatus>
  );

  const renderSection = () => {
    if (section === 'feedback') return <FeedbackSection />;
    if (!exp)
      return (
        <p className="text-sm text-muted-foreground">
          {error ? 'The experiment could not be loaded. See the message above.' : 'Loading the experiment…'}
        </p>
      );
    switch (section) {
      case 'aim':
        return (
          <AimSection
            aim={exp.aim}
            apparatus={exp.apparatus}
            subtitle="Electrical Engineering · Three-phase induction motor"
            objectives={OBJECTIVES}
            startLabel="Start the simulation"
            onStart={() => choose('simulation')}
          />
        );
      case 'theory':
        return <TheorySection exp={exp} />;
      case 'procedure':
        return (
          <ProcedureSection
            stages={exp.stages}
            flags={flags}
            safetyChecks={exp.safetyChecks}
            ticks={ticks}
            onTick={toggleTick}
            onOpen={choose}
          />
        );
      case 'simulation':
        return (
          <LabSimulation
            exp={exp}
            rig={rig}
            loadFraction={lf}
            armed={armed}
            ticked={ticked}
            total={safetyChecks.length}
            view={view}
            onView={setView}
            cutaway={cutaway}
            onCutaway={setCutaway}
            part={part}
            onPart={pick}
            highlight={voiceHighlight ?? highlight}
            onGoProcedure={() => choose('procedure')}
          />
        );
      case 'observations':
        return <ObservationsSection api={obs} sim={rig.sim} canCapture={canCapture} captureHint={captureHint} />;
      case 'graphs':
        return <GraphsSection api={obs} />;
      case 'calculations':
        return <CalculationsSection exp={exp} api={obs} />;
      case 'viva':
        return <VivaSection api={obs} onScore={setVivaScore} />;
      case 'oral':
        return user?.role === 'student' ? <OralSelfAssessment experimentId="induction-motor" /> : null;
      case 'references':
        return (
          <ReferencesSection
            items={exp.references}
            subtitle="Sources for the theory, the nameplate values and the calculations."
          />
        );
    }
  };

  return (
    <div className="relative h-dvh overflow-hidden bg-background">
      <div className="relative z-10 flex h-full flex-col gap-3 p-3 md:p-4">
        <NavBar
          title={exp?.title ?? 'Three-phase induction motor load test'}
          kicker="Electrical Engineering"
          progress={stages.length ? doneCount / stages.length : 0}
          onMenu={() => setMenuOpen(true)}
          status={status}
        />

        <div className="flex min-h-0 flex-1 flex-col gap-3 lg:flex-row">
          <Sidebar sections={sections} active={section} onSelect={choose} badges={badges} />
          <MobileNav
            open={menuOpen}
            onOpenChange={setMenuOpen}
            sections={sections}
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

      <VoiceAssistant lab={voice} tools={buildInductionVoiceTools} />
    </div>
  );
}
