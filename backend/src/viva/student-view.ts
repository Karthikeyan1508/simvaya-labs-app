import { type Question, type StudentQuestion } from './types';

// Builds the student view from a whitelist. Answer key, tolerance, explanation, peakX, aliases,
// point target and step are never copied, so they cannot leak before submit.
export function toStudentQuestion(q: Question): StudentQuestion {
  const out: StudentQuestion = { id: q.id, kind: q.kind, prompt: q.prompt, points: q.points };
  if (q.options) out.options = [...q.options];
  if (q.unit) out.unit = q.unit;
  if (q.graph) out.graph = { x: q.graph.x, y: q.graph.y, xLabel: q.graph.xLabel, yLabel: q.graph.yLabel };
  if (q.kind === 'highlight' && q.partId) out.highlightPartId = q.partId;
  return out;
}
