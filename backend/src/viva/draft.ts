import { isPartId, PELTON_PARTS, type PartTable } from './part-aliases';
import { type DraftQuestion, VIVA_KINDS, type VivaKind } from './types';

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

const clean = (v: unknown, max: number): string | undefined => {
  if (typeof v !== 'string') return undefined;
  const t = v.trim();
  return t && t.length <= max ? t : undefined;
};

// Checks one question from an AI agent or from Groq. Returns the clean question, or the reason it was refused.
// parts is the lab the question belongs to, for point and highlight.
export function parseDraft(raw: unknown, parts: PartTable = PELTON_PARTS): DraftQuestion | string {
  if (!raw || typeof raw !== 'object') return 'Question must be an object';
  const r = raw as Record<string, unknown>;
  if (!(VIVA_KINDS as readonly unknown[]).includes(r.kind)) return 'Unknown question kind';
  const kind = r.kind as VivaKind;
  const prompt = clean(r.prompt, 1000);
  if (!prompt) return 'Prompt is required (max 1000 characters)';
  const points = r.points ?? 1;
  if (!isNum(points) || points <= 0 || points > 100) return 'Points must be above 0 and at most 100';

  const q: DraftQuestion = {
    kind,
    prompt,
    points,
    source: r.source === 'ai' || r.source === 'template' ? r.source : 'manual',
  };
  if (typeof r.explanation === 'string' && r.explanation.trim()) q.explanation = r.explanation.trim().slice(0, 2000);

  switch (kind) {
    case 'explain':
      break;
    case 'mcq':
    case 'formula': {
      const options = Array.isArray(r.options) ? r.options.map((o) => clean(o, 300)) : [];
      const answer = r.answer;
      if (options.length < 2 || options.length > 6 || options.some((o) => o === undefined)) {
        return 'Options need 2 to 6 short choices';
      }
      if (typeof answer !== 'number' || !Number.isInteger(answer) || answer < 0 || answer >= options.length) {
        return 'Answer must be the index of one option';
      }
      q.options = options as string[];
      q.answer = answer;
      break;
    }
    case 'point':
    case 'highlight':
      if (!isPartId(r.partId, parts)) return 'partId must be a real part of the rig';
      q.partId = r.partId;
      break;
    case 'step': {
      const step = r.step;
      if (typeof step !== 'number' || !Number.isInteger(step) || step < 1 || step > 9) return 'Step must be 1 to 9';
      q.step = step;
      break;
    }
    case 'calc':
    case 'graph': {
      if (!isNum(r.expected)) return 'Expected value must be a finite number';
      q.expected = r.expected;
      const unit = clean(r.unit, 20);
      if (unit) q.unit = unit;
      if (r.tolerance !== undefined) {
        if (!isNum(r.tolerance) || r.tolerance < 0 || r.tolerance > 1) return 'Tolerance must be between 0 and 1';
        q.tolerance = r.tolerance;
      }
      if (kind === 'graph') {
        const graph = parseGraph(r.graph);
        if (typeof graph === 'string') return graph;
        q.graph = graph;
      }
      break;
    }
  }
  return q;
}

function parseGraph(raw: unknown): NonNullable<DraftQuestion['graph']> | string {
  if (!raw || typeof raw !== 'object') return 'Graph data is required';
  const g = raw as Record<string, unknown>;
  const { x, y } = g;
  if (!Array.isArray(x) || !Array.isArray(y) || x.length !== y.length || x.length < 3 || x.length > 200) {
    return 'Graph needs matching x and y lists of 3 to 200 numbers';
  }
  if (!x.every(isNum) || !y.every(isNum)) return 'Graph values must be finite numbers';
  const xLabel = clean(g.xLabel, 80);
  const yLabel = clean(g.yLabel, 80);
  if (!xLabel || !yLabel) return 'Graph needs an x label and a y label';
  const graph: NonNullable<DraftQuestion['graph']> = { x, y, xLabel, yLabel };
  if (g.peakX !== undefined) {
    if (!isNum(g.peakX)) return 'peakX must be a number';
    graph.peakX = g.peakX;
  }
  return graph;
}
