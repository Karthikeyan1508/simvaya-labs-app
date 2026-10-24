'use client';

import { QuizSection } from '@/components/lab/sections/quiz-section';
import type { DerivedReadings, ObservationRow } from '@/lib/induction';
import type { Question } from '@/lib/quiz';
import type { RowsApi } from './lab-rows';

// Options for a numeric answer: the true value and three wrong ones. The answer's position comes from the value,
// so the order is the same on every render.
function numeric(v: number, digits: number, unit: string) {
  const text = (x: number) => `${x.toFixed(digits)}${unit}`;
  const wrong: string[] = [];
  const seen = new Set([text(v)]);
  for (const f of [0.5, 1.6, 0.8, 1.25, 2.2]) {
    const s = text(v * f);
    if (!seen.has(s)) {
      seen.add(s);
      wrong.push(s);
    }
    if (wrong.length === 3) break;
  }
  if (wrong.length < 3) return null;
  const answer = Math.round(Math.abs(v) * 7) % 4;
  const options = [...wrong];
  options.splice(answer, 0, text(v));
  return { options, answer };
}

type Calculated = { r: ObservationRow; d: DerivedReadings };

// Questions drawn from the student's own valid rows: slip and current at the highest load, speed at no load.
function dataQuestions(list: Calculated[]): Question[] {
  const out: Question[] = [];
  const loaded = list.filter((x) => x.d.valid && x.d.torqueNm !== null && x.d.torqueNm > 0.5 && x.d.slipPct !== null);
  const top = loaded.reduce<Calculated | null>((b, x) => (!b || x.d.torqueNm! > b.d.torqueNm! ? x : b), null);
  if (top && top.d.slipPct !== null && top.d.pinW !== null) {
    const N = top.r.raw.speedRpm;
    const slip = numeric(top.d.slipPct, 2, ' %');
    if (slip) {
      out.push({
        q: `At your highest load (observation ${top.r.observation}, torque ${top.d.torqueNm!.toFixed(2)} N·m), what was the slip?`,
        options: slip.options,
        answer: slip.answer,
        why: `Slip = (Ns − N) / Ns × 100. With Ns = 1500 rpm and N = ${N.toFixed(1)} rpm, the slip is ${top.d.slipPct.toFixed(2)} %.`,
      });
    }
    const current = numeric(top.r.raw.IL, 2, ' A');
    if (current) {
      out.push({
        q: `At the same load, what line current did you read?`,
        options: current.options,
        answer: current.answer,
        why: `The line current follows the input power. At this load the input power was ${top.d.pinW.toFixed(0)} W, which needs ${top.r.raw.IL.toFixed(2)} A at the line voltage and power factor.`,
      });
    }
  }

  const idle = list.find((x) => x.d.valid && x.d.torqueNm !== null && x.d.torqueNm < 0.05 && x.r.raw.speedRpm > 0);
  if (idle) {
    const speed = numeric(idle.r.raw.speedRpm, 0, ' rpm');
    if (speed) {
      out.push({
        q: `At no load (observation ${idle.r.observation}), what was the shaft speed?`,
        options: speed.options,
        answer: speed.answer,
        why: 'At no load the motor runs just below the 1500 rpm synchronous speed, because only friction and windage torque must be overcome.',
      });
    }
  }
  return out;
}

const THEORY: Question[] = [
  {
    q: 'In the two-wattmeter method, what does the sum W1 + W2 give?',
    options: ['Total three-phase input power', 'Reactive power only', 'Shaft output power', 'Line voltage'],
    answer: 0,
    why: 'Each wattmeter reads the power of a pair of lines, and the two readings add to the total three-phase input power. Either reading can be negative at low power factor, so keep its sign.',
  },
  {
    q: 'Why does a squirrel-cage rotor run slower than synchronous speed?',
    options: [
      'Its bars need relative motion through the stator field to induce current and torque',
      'Its end rings are fed from the supply',
      'Its bearings add a fixed slip',
      'Its frequency is lower than the stator frequency',
    ],
    answer: 0,
    why: 'The rotor has no supply connection. Its bars carry current only while the rotating stator field cuts them. At synchronous speed there is no relative motion, so no current and no torque.',
  },
  {
    q: 'Which test gives the friction, windage and core losses?',
    options: ['No-load test', 'Blocked-rotor test', 'Full-load test', 'Insulation test'],
    answer: 0,
    why: 'At no load the rotor turns close to synchronous speed, so the input power is mostly friction, windage and core loss.',
  },
  {
    q: 'Which test holds the rotor still?',
    options: ['No-load test', 'Blocked-rotor test', 'Full-load test', 'Slip test'],
    answer: 1,
    why: 'The blocked-rotor test holds the rotor still at a reduced voltage and gives the short-circuit parameters. The no-load test lets the rotor turn freely.',
  },
];

export function VivaSection({ api, onScore }: { api: RowsApi; onScore: (score: number | null) => void }) {
  const list: Calculated[] = [];
  for (const r of api.rows) {
    const d = api.derivedOf(r);
    if (d) list.push({ r, d });
  }
  const data = dataQuestions(list);
  const questions = [...data, ...THEORY];
  // Restarts the quiz when the questions change, so no answer is held against the wrong question.
  const version = questions.map((q) => `${q.q}:${q.answer}`).join('|');

  return (
    <div className="space-y-4">
      {data.length === 0 && (
        <p className="max-w-3xl text-sm text-muted-foreground">
          Capture a no-load reading and a reading at a load to add questions drawn from your own data. The theory
          questions are below.
        </p>
      )}
      <QuizSection
        key={version}
        title="Viva"
        subtitle="Answer every question, then submit. Explanations appear after you submit."
        questions={questions}
        onScore={onScore}
      />
    </div>
  );
}
