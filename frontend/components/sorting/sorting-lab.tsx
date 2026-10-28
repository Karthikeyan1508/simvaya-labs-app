'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useSession } from '@/components/app/session-provider';
import { AimSection } from '@/components/lab/sections/aim-section';
import { FeedbackSection } from '@/components/lab/sections/feedback-section';
import { QuizSection } from '@/components/lab/sections/quiz-section';
import { ReferencesSection, type Reference } from '@/components/lab/sections/references-section';
import { MobileNav } from '@/components/lab/mobile-nav';
import { NavBar, NavStatus } from '@/components/lab/nav-bar';
import { ShaderBackground } from '@/components/lab/shader-background';
import { Sidebar } from '@/components/lab/sidebar';
import { Kbd } from '@/components/ui/kbd';
import { OralSelfAssessment } from '@/components/viva/oral-self-assessment';
import { VoiceAssistant } from '@/components/voice/voice-assistant';
import { logActivity } from '@/lib/account';
import { SORT_SECTIONS, isSortSectionId, type SortSectionId } from '@/lib/sections';
import { cn } from '@/lib/utils';
import {
  buildSortingPrompt,
  buildSortingVoiceTools,
  SORTING_FIRST_MESSAGE,
  SORTING_TITLE,
  SORTING_VOICE_PARTS,
  type SortingVoiceBridge,
} from '@/lib/voice-sorting';
import { BarChart } from './bar-chart';
import { CodeReference } from './code-reference';
import { describeStep, makeInput, pivotAt, quickSort, seededRandom, type Preset } from './engine';
import { InputPanel } from './input-panel';
import { SortCalculations, type RecordedRun } from './sort-calculations';
import { SortGraphs } from './sort-graphs';
import { SORT_QUIZ } from './sort-quiz';
import { SortTheory } from './sort-theory';
import { StepBar } from './step-bar';
import { StepList } from './step-list';

const EXPERIMENT_ID = 'sorting-visualiser';
const INITIAL_SIZE = 12;

const AIM =
  'Follow how quick sort splits an array around a pivot, then measure how its work grows with the number of items.';
const OBJECTIVES = [
  'Trace one partition step by step.',
  'Count the comparisons and swaps in a run.',
  'Compare the measured work with the n log n and n² formulas.',
];
const APPARATUS = [
  'Array of 6 to 30 distinct values',
  'Bar chart that replays each step',
  'Read-only code in five languages',
  'Counters for comparisons and swaps',
];

const VOICE_PROMPT = buildSortingPrompt({ aim: AIM, objectives: OBJECTIVES, apparatus: APPARATUS });

// Check each citation against the library record before publishing.
const SORT_REFERENCES: Reference[] = [
  {
    title: 'Introduction to Algorithms, 3rd edition',
    source: 'T. H. Cormen, C. E. Leiserson, R. L. Rivest and C. Stein, MIT Press',
    note: 'Quick sort, the partition and the expected running time.',
  },
  {
    title: 'Quicksort',
    source: 'C. A. R. Hoare, The Computer Journal, 1962',
    note: 'The original description of the algorithm.',
  },
  {
    title: 'Algorithms, 4th edition',
    source: 'R. Sedgewick and K. Wayne, Addison-Wesley',
    note: 'Quick sort, its recurrence and the comparison counts.',
  },
];

// The sorting lab: the lab shell with sections. The visualiser holds the run, so the other sections read the same steps.
export function SortingLab() {
  const { user } = useSession();
  // The oral self-assessment is for students only.
  const sections = user?.role === 'student' ? SORT_SECTIONS : SORT_SECTIONS.filter((s) => s.id !== 'oral');
  const [section, setSection] = useState<SortSectionId>('aim');
  const [menuOpen, setMenuOpen] = useState(false);
  const [size, setSize] = useState(INITIAL_SIZE);
  const [preset, setPreset] = useState<Preset>('random');
  // Seeded so the server and the first browser render match. Shuffle uses Math.random in a click handler.
  const [input, setInput] = useState(() => makeInput(INITIAL_SIZE, 'random', seededRandom(7)));
  const [cur, setCur] = useState(0); // steps applied so far
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(4);
  const [runs, setRuns] = useState<RecordedRun[]>([]);
  const [quizScore, setQuizScore] = useState<number | null>(null);
  // Set by the voice assistant: the panels it names are ringed until cleared.
  const [voiceHighlight, setVoiceHighlight] = useState<string[] | null>(null);
  const ring = (id: string) => (voiceHighlight?.includes(id) ? 'rounded-lg ring-2 ring-primary' : undefined);
  const logged = useRef(false);

  // The section lives in the URL hash so a refresh keeps you in place. The hash is written only on a
  // choice, so the restore read never races a write.
  useEffect(() => {
    const h = window.location.hash.slice(1);
    if (isSortSectionId(h)) setSection(h);
  }, []);

  const choose = (id: SortSectionId) => {
    setSection(id);
    window.history.replaceState(null, '', `#${id}`);
  };

  useEffect(() => {
    if (logged.current) return;
    logged.current = true;
    logActivity('experiment_opened', EXPERIMENT_ID).catch(() => undefined);
  }, []);

  const steps = useMemo(() => quickSort(input), [input]);
  const total = steps.length;
  const at = Math.min(cur, total);
  const current = at > 0 ? steps[at - 1] : undefined;
  const shown = at > 0 ? steps[at - 1].arr : input;

  // Counts for the steps played so far, shown in the visualiser.
  const applied = steps.slice(0, at);
  const comparisons = applied.filter((s) => s.type === 'compare').length;
  const swaps = applied.filter((s) => s.type === 'swap').length;
  const placed = new Set(applied.filter((s) => s.type === 'place' || s.type === 'done').map((s) => s.i));

  // Counts for the whole run, used by the calculations and the recorded table.
  const runComparisons = steps.filter((s) => s.type === 'compare').length;
  const runSwaps = steps.filter((s) => s.type === 'swap').length;

  const newInput = (n: number, p: Preset) => {
    setSize(n);
    setPreset(p);
    setInput(makeInput(n, p));
    setCur(0);
    setPlaying(false);
  };

  const reset = () => {
    setPlaying(false);
    setCur(0);
  };
  const stepBy = (d: number) => setCur((c) => Math.max(0, Math.min(total, c + d)));
  const togglePlay = () => {
    if (!playing && at >= total) setCur(0);
    setPlaying((p) => !p);
  };

  useEffect(() => {
    if (!playing) return;
    const id = window.setInterval(() => setCur((c) => Math.min(c + 1, total)), 1000 / speed);
    return () => window.clearInterval(id);
  }, [playing, speed, total]);

  // Stop at the last step.
  useEffect(() => {
    if (playing && at >= total) setPlaying(false);
  }, [playing, at, total]);

  // Space play, arrows step, R reset. Only on the visualiser. Keys typed into a control are left alone.
  const keys = useRef<(e: KeyboardEvent) => void>(() => {});
  keys.current = (e) => {
    if (section !== 'visualiser') return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const t = e.target as HTMLElement | null;
    if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
    const onSlider = t?.getAttribute('role') === 'slider';
    if (e.key === ' ') {
      if (onSlider || t?.tagName === 'BUTTON') return;
      e.preventDefault();
      togglePlay();
    } else if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      if (onSlider) return;
      stepBy(e.key === 'ArrowRight' ? 1 : -1);
    } else if (e.key.toLowerCase() === 'r') reset();
  };
  useEffect(() => {
    const handler = (e: KeyboardEvent) => keys.current(e);
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const recordRun = () => {
    setRuns((r) => [
      ...r,
      { id: r.length + 1, n: size, preset, comparisons: runComparisons, swaps: runSwaps },
    ]);
  };

  const badges: Partial<Record<SortSectionId, string>> = {
    visualiser: total ? `${at}/${total}` : undefined,
    calculations: runs.length ? `${runs.length} runs` : undefined,
    quiz: quizScore !== null ? `${quizScore}/${SORT_QUIZ.length}` : undefined,
  };

  const renderVisualiser = () => (
    <div className="flex flex-1 flex-col gap-3 xl:min-h-0">
      <div className={ring('playback')}>
        <StepBar
          at={at}
          total={total}
          text={current ? describeStep(current) : 'Press Play or Next to start the sort.'}
          playing={playing}
          speed={speed}
          onSpeed={setSpeed}
          onPlay={togglePlay}
          onPrev={() => stepBy(-1)}
          onNext={() => stepBy(1)}
          onReset={reset}
        />
      </div>

      <div className="grid min-w-0 gap-3 xl:min-h-0 xl:flex-1 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="flex min-h-0 min-w-0 flex-col gap-3">
          <section className={cn('glass min-w-0 rounded-lg p-4 md:p-5', ring('bars'))}>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
              <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
                <Legend swatch="bg-foreground" label="Pivot" />
                <Legend swatch="orange-gradient" label="Compared or swapped" />
                <Legend swatch="bg-foreground/55" label="Placed" />
                <Legend swatch="bg-muted-foreground/35" label="Not yet" />
              </div>
              <div className={cn('num flex gap-4 text-xs text-muted-foreground', ring('counters'))}>
                <span>
                  Comparisons <span className="text-sm font-semibold text-foreground">{comparisons}</span>
                </span>
                <span>
                  Swaps <span className="text-sm font-semibold text-foreground">{swaps}</span>
                </span>
                <span>
                  Step <span className="text-sm font-semibold text-foreground">{at}</span> of {total}
                </span>
              </div>
            </div>

            <BarChart
              arr={shown}
              pivot={pivotAt(current)}
              i={current?.i ?? -1}
              j={current?.j ?? -1}
              kind={current?.type ?? ''}
              sorted={placed}
              lo={current?.lo ?? -1}
              hi={current?.hi ?? -1}
            />

            <p className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Kbd>Space</Kbd> play or pause
              </span>
              <span className="flex items-center gap-1.5">
                <Kbd>←</Kbd>
                <Kbd>→</Kbd> step
              </span>
              <span className="flex items-center gap-1.5">
                <Kbd>R</Kbd> reset
              </span>
            </p>
          </section>

          <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-3 xl:flex-row">
            <div className={cn('min-h-0 xl:w-80 xl:shrink-0 xl:overflow-y-auto', ring('input'))}>
              <InputPanel
                size={size}
                preset={preset}
                onSize={(n) => newInput(n, preset)}
                onPreset={(p) => newInput(size, p)}
                onShuffle={() => newInput(size, 'random')}
              />
            </div>
            <div className={cn('flex min-h-0 min-w-0 flex-1 flex-col', ring('steps'))}>
              <StepList steps={steps} at={at} onJump={(n) => setCur(n)} />
            </div>
          </div>
        </div>

        <div className={cn('flex min-h-0 min-w-0 flex-col', ring('code'))}>
          <CodeReference />
        </div>
      </div>
    </div>
  );

  const renderSection = () => {
    switch (section) {
      case 'aim':
        return (
          <AimSection
            aim={AIM}
            apparatus={APPARATUS}
            objectives={OBJECTIVES}
            subtitle="Computer Science · Sorting"
            startLabel="Open the visualiser"
            onStart={() => choose('visualiser')}
          />
        );
      case 'theory':
        return <SortTheory />;
      case 'visualiser':
        return renderVisualiser();
      case 'calculations':
        return (
          <SortCalculations
            n={size}
            preset={preset}
            steps={steps}
            runs={runs}
            onRecord={recordRun}
            onClear={() => setRuns([])}
          />
        );
      case 'graphs':
        return <SortGraphs n={size} />;
      case 'quiz':
        return (
          <QuizSection
            title="Quiz"
            subtitle="Five questions about quick sort and what it costs."
            questions={SORT_QUIZ}
            onScore={setQuizScore}
          />
        );
      case 'oral':
        return user?.role === 'student' ? <OralSelfAssessment experimentId="sorting-visualiser" /> : null;
      case 'references':
        return (
          <ReferencesSection
            items={SORT_REFERENCES}
            subtitle="Sources for the partition, the recurrence and the complexity."
          />
        );
      case 'feedback':
        return <FeedbackSection />;
    }
  };

  const status = (
    <NavStatus>
      <div className="num px-3 py-1.5 text-muted-foreground">
        Step <span className="text-foreground">{at}</span> of {total}
      </div>
      <div className="num px-3 py-1.5 text-muted-foreground">
        <span className="text-foreground">{comparisons}</span> comparisons
      </div>
      <div className="num px-3 py-1.5 text-muted-foreground">
        <span className="text-foreground">{swaps}</span> swaps
      </div>
    </NavStatus>
  );

  const voice: SortingVoiceBridge = {
    parts: SORTING_VOICE_PARTS,
    prompt: VOICE_PROMPT,
    firstMessage: SORTING_FIRST_MESSAGE,
    setVoiceHighlight,
    steps,
    at,
    size,
    preset,
    setStep: setCur,
    newInput,
    showVisualiser: () => choose('visualiser'),
  };

  return (
    <div className="relative h-dvh overflow-hidden">
      <ShaderBackground />

      <div className="relative z-10 flex h-full flex-col gap-3 p-3 md:p-4">
        <NavBar
          kicker="Computer Science"
          title={SORTING_TITLE}
          progress={total ? at / total : 0}
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

          <main className="glass flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto rounded-lg p-4 md:p-5">
            {renderSection()}
          </main>
        </div>
      </div>

      <VoiceAssistant lab={voice} tools={buildSortingVoiceTools} />
    </div>
  );
}

function Legend({ swatch, label }: { swatch: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={`inline-block size-2.5 rounded-sm ${swatch}`} />
      {label}
    </span>
  );
}
