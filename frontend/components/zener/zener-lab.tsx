'use client';

import { BookOpen, Box, Calculator, Check, Library, ListOrdered, MessageSquare, Table2, Target, TrendingUp } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MobileNav } from '@/components/lab/mobile-nav';
import { NavBar, NavStatus } from '@/components/lab/nav-bar';
import { Sidebar } from '@/components/lab/sidebar';
import { AimSection } from '@/components/lab/sections/aim-section';
import { FeedbackSection } from '@/components/lab/sections/feedback-section';
import { ReferencesSection } from '@/components/lab/sections/references-section';
import { SectionHead } from '@/components/lab/section-head';
import { Button } from '@/components/ui/button';
import { logActivity } from '@/lib/account';
import type { SectionDef } from '@/lib/sections';
import { ZENER_APPARATUS, ZENER_AIM, ZENER_OBJECTIVES, ZENER_REFERENCES, ZENER_STEPS } from '@/lib/zener/content';
import { lineRegulation, loadCurve, loadRegulation } from '@/lib/zener/regulation';
import { RS_OHM, solve, sweepVs, VS_MAX_V, VZ_V } from '@/lib/zener/solver';
import { EMPTY_WIRING, type Wiring } from '@/lib/zener/wiring';
import { cn } from '@/lib/utils';
import type { ZenerViewName } from './zener-views';
import type { ZenerReadings } from './zener-parts';
import { RL_MAX, RL_MIN, type ZenerMode, ZenerSimulation } from './zener-simulation';
import { type Observation, ZenerCalculations, ZenerGraphs, ZenerObservations, ZenerTheory } from './zener-sections';

const ZENER_SECTION_IDS = [
  'aim',
  'theory',
  'procedure',
  'simulation',
  'observations',
  'graphs',
  'calculations',
  'references',
  'feedback',
] as const;

export type ZenerSectionId = (typeof ZENER_SECTION_IDS)[number];

export const ZENER_SECTIONS: SectionDef<ZenerSectionId>[] = [
  { id: 'aim', label: 'Aim', hint: 'Objectives and apparatus', icon: Target },
  { id: 'theory', label: 'Theory', hint: 'Breakdown and regulation', icon: BookOpen },
  { id: 'procedure', label: 'Procedure', hint: 'Eight steps', icon: ListOrdered },
  { id: 'simulation', label: 'Simulation', hint: 'Bench, meters, supply and load', icon: Box },
  { id: 'observations', label: 'Observations', hint: 'Readings table and CSV', icon: Table2 },
  { id: 'graphs', label: 'Graphs', hint: 'Vout, Iz and load curve', icon: TrendingUp },
  { id: 'calculations', label: 'Calculations', hint: 'Formulas with numbers', icon: Calculator },
  { id: 'references', label: 'References', hint: 'Sources', icon: Library },
  { id: 'feedback', label: 'Feedback', hint: 'Tell us what you think', icon: MessageSquare },
];

const isZenerSectionId = (v: string): v is ZenerSectionId => (ZENER_SECTION_IDS as readonly string[]).includes(v);

const RL_CURVE = Array.from({ length: 20 }, (_, i) => RL_MIN + i * 100);

const RELATIONS = [
  { label: 'Zener voltage', value: `Vz = ${VZ_V} V` },
  { label: 'Output while regulating', value: 'Vout = Vz' },
  { label: 'Zener current', value: 'Iz = (Vs - Vz) / Rs - IL' },
  { label: 'Zener power', value: 'Pz = Vz x Iz' },
];

// Shell for the Zener regulator lab: the bench with its meters, the solver readings and the manual's procedure.
export function ZenerLab() {
  const [section, setSection] = useState<ZenerSectionId>('aim');
  const [visited, setVisited] = useState<ZenerSectionId[]>([]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [vs, setVs] = useState(8);
  const [rl, setRl] = useState<number | null>(1000);
  const [switchOn, setSwitchOn] = useState(true);
  const [hideValues, setHideValues] = useState(false);
  const [rows, setRows] = useState<Observation[]>([]);
  const [stepIndex, setStepIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [view, setViewState] = useState<{ name: ZenerViewName; nonce: number }>({ name: 'iso', nonce: 0 });
  const [selected, setSelected] = useState<string | null>(null);
  const [showLabels, setShowLabels] = useState(true);
  const [mode, setMode] = useState<ZenerMode>('simulate');
  const [wiring, setWiring] = useState<Wiring>(EMPTY_WIRING); // kept across mode switches
  const nextId = useRef(1);
  const logged = useRef(false);

  // The section lives in the URL hash. The hash is written only on a choice, so the restore read never races a write.
  useEffect(() => {
    const h = window.location.hash.slice(1);
    if (isZenerSectionId(h)) setSection(h);
  }, []);

  const choose = useCallback((id: ZenerSectionId) => {
    setSection(id);
    window.history.replaceState(null, '', `#${id}`);
  }, []);

  useEffect(() => {
    setVisited((v) => (v.includes(section) ? v : [...v, section]));
  }, [section]);

  useEffect(() => {
    if (logged.current) return;
    logged.current = true;
    logActivity('experiment_opened', 'zener-regulator').catch(() => undefined);
  }, []);

  // The open switch cuts the supply: every reading goes to zero.
  const result = useMemo(() => solve({ vs: switchOn ? vs : 0, rs: RS_OHM, vz: VZ_V, rl }), [vs, rl, switchOn]);
  const op = result.ok ? result : null;
  const regulating = (op?.regulating ?? false) && switchOn;

  const readings = useMemo<ZenerReadings | null>(
    () => (op && switchOn ? { vRs: vs - op.vOut, vOut: op.vOut, iz: op.iZ } : null),
    [op, switchOn, vs],
  );
  const shown = op && switchOn ? op : null;

  const sweep = useMemo(() => sweepVs({ rs: RS_OHM, vz: VZ_V, rl }, 0, VS_MAX_V, 0.25), [rl]);
  const vOutSeries = sweep.map((p) => ({ x: p.vs, y: p.op.vOut }));
  const izSeries = sweep.map((p) => ({ x: p.vs, y: p.op.iZ * 1000 }));
  const loadSeries = useMemo(() => loadCurve(vs, RL_CURVE), [vs]);

  const lineReg = useMemo(() => lineRegulation(rows), [rows]);
  const loadReg = useMemo(() => loadRegulation(rows), [rows]);

  const distinctVs = new Set(rows.map((r) => r.vs)).size;
  const distinctRl = new Set(rows.map((r) => String(r.rl))).size;
  const passes = [
    visited.includes('simulation'),
    switchOn && visited.includes('simulation'),
    rows.length >= 1,
    distinctVs >= 4,
    distinctRl >= 3,
    rows.length >= 6,
    visited.includes('calculations'),
    visited.includes('graphs'),
  ];
  const steps = ZENER_STEPS.map((st, i) => ({ ...st, pass: passes[i] }));
  const doneCount = steps.filter((s) => s.pass).length;

  const badges: Partial<Record<ZenerSectionId, string>> = {
    procedure: `${doneCount}/${steps.length}`,
    observations: rows.length ? `${rows.length} rows` : undefined,
  };

  const record = () => {
    if (!op || !switchOn) return;
    setRows((r) => [...r, { id: nextId.current++, vs, rl, vOut: op.vOut, iZ: op.iZ, pZ: op.pZ }]);
  };

  // The manual's two tables: line regulation at 1 kΩ, then load regulation at 15 V. Existing readings are kept.
  const autoRecord = () => {
    const out = [...rows];
    for (const [v, r] of [
      [8, 1000],
      [10, 1000],
      [12, 1000],
      [15, 1000],
      [15, null],
      [15, 470],
      [15, 220],
    ] as const) {
      if (out.some((x) => x.vs === v && x.rl === r)) continue;
      const o = solve({ vs: v, rs: RS_OHM, vz: VZ_V, rl: r });
      if (o.ok) out.push({ id: nextId.current++, vs: v, rl: r, vOut: o.vOut, iZ: o.iZ, pZ: o.pZ });
    }
    setRows(out);
  };

  // A new nonce re-runs the same view, so Reset view always glides even when the view is already active.
  const setView = (name: ZenerViewName) => setViewState((v) => ({ name, nonce: v.nonce + 1 }));

  const status = (
    <NavStatus>
      <div className="flex items-center gap-2 px-3 py-1.5">
        <span className={cn('size-1.5 rounded-full', regulating ? 'led bg-primary' : 'bg-muted-foreground/40')} />
        <span className={cn(regulating ? 'text-foreground' : 'text-muted-foreground')}>
          {!switchOn ? 'Switch open' : !result.ok ? 'Invalid setting' : regulating ? 'Regulating' : 'Not regulating'}
        </span>
      </div>
      <div className="num px-3 py-1.5 text-muted-foreground">
        Vout <span className="text-foreground">{op && switchOn ? op.vOut.toFixed(2) : '—'}</span> V
      </div>
      <div className="num px-3 py-1.5 text-muted-foreground">
        <span className="text-foreground">{doneCount}</span>/{steps.length} steps
      </div>
    </NavStatus>
  );

  const renderSection = () => {
    switch (section) {
      case 'aim':
        return (
          <AimSection
            aim={ZENER_AIM}
            apparatus={ZENER_APPARATUS}
            subtitle="Electronics & Communication · Experiment 06 · Analog electronics"
            objectives={ZENER_OBJECTIVES}
            startLabel="Start the simulation"
            onStart={() => choose('simulation')}
          />
        );
      case 'theory':
        return <ZenerTheory relations={RELATIONS} />;
      case 'procedure':
        return (
          <div className="space-y-8">
            <SectionHead title="Procedure" subtitle="Eight steps from the manual. Each one ticks when the bench shows it done." />
            <ol className="space-y-2">
              {steps.map((s, i) => (
                <li
                  key={i}
                  className={cn(
                    'flex items-start gap-3 rounded-lg border border-border px-4 py-3 text-sm',
                    s.pass && 'border-primary/40 bg-primary/5',
                  )}
                >
                  <span
                    className={cn(
                      'mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border border-border text-xs',
                      s.pass && 'border-primary bg-primary text-primary-foreground',
                    )}
                  >
                    {s.pass ? <Check className="size-3" /> : i + 1}
                  </span>
                  <span>{s.text}</span>
                </li>
              ))}
            </ol>
          </div>
        );
      case 'simulation':
        return (
          <div className="space-y-6">
            <SectionHead
              title="Simulation"
              subtitle={
                mode === 'wire'
                  ? 'Wire the circuit yourself. Drag parts onto the bench, join their terminals, then check your wiring.'
                  : 'Read the meters as on the bench. Pick a step, a view or a part, then set the supply and the load.'
              }
            />
            <ZenerSimulation
              mode={mode}
              onMode={setMode}
              wiring={wiring}
              onWiring={setWiring}
              vs={vs}
              onVs={setVs}
              rl={rl}
              onRl={setRl}
              switchOn={switchOn}
              onSwitch={setSwitchOn}
              op={op}
              messages={result.ok ? [] : result.messages}
              readings={readings}
              hideValues={hideValues}
              onHide={setHideValues}
              steps={steps}
              stepIndex={stepIndex}
              onStep={setStepIndex}
              playing={playing}
              onPlaying={setPlaying}
              view={view}
              onView={setView}
              selected={selected}
              onSelect={setSelected}
              showLabels={showLabels}
              onLabels={setShowLabels}
              onRecord={record}
              onAutoRecord={autoRecord}
            />
          </div>
        );
      case 'observations':
        return (
          <ZenerObservations
            rows={rows}
            onRemove={(id) => setRows((r) => r.filter((x) => x.id !== id))}
            onClear={() => setRows([])}
          />
        );
      case 'graphs':
        return <ZenerGraphs vOut={vOutSeries} iZ={izSeries} loadCurve={loadSeries} />;
      case 'calculations':
        return (
          <ZenerCalculations
            vs={vs}
            rl={rl}
            op={op}
            latest={rows.length ? rows[rows.length - 1] : null}
            lineReg={lineReg}
            loadReg={loadReg}
          />
        );
      case 'references':
        return <ReferencesSection items={ZENER_REFERENCES} subtitle="Manual and component sources for the values used here." />;
      case 'feedback':
        return <FeedbackSection />;
    }
  };

  return (
    <div className="relative h-dvh overflow-hidden bg-background">
      <div className="relative z-10 flex h-full flex-col gap-3 p-3 md:p-4">
        <NavBar
          title="Zener diode as voltage regulator"
          kicker="Electronics & Communication"
          progress={doneCount / steps.length}
          onMenu={() => setMenuOpen(true)}
          status={status}
        />

        <div className="flex min-h-0 flex-1 flex-col gap-3 lg:flex-row">
          <Sidebar sections={ZENER_SECTIONS} active={section} onSelect={choose} badges={badges} />
          <MobileNav
            open={menuOpen}
            onOpenChange={setMenuOpen}
            sections={ZENER_SECTIONS}
            active={section}
            onSelect={choose}
            badges={badges}
          />

          <main className="glass min-h-0 min-w-0 flex-1 overflow-y-auto rounded-lg p-5 md:p-7">{renderSection()}</main>
        </div>
      </div>
    </div>
  );
}
