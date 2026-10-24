import type { ExperimentDef } from '@/lib/types';

// Parts the assistant names in a sentence, in the order they are said (at most three). A part matches by its full
// label, or by its last word when that word is long enough to be specific ("Pelton runner" also matches "runner").
export function partsMentioned(exp: ExperimentDef | null, text: string): string[] {
  if (!exp) return [];
  const said = text.toLowerCase();
  const hits: { id: string; at: number }[] = [];
  for (const c of exp.components) {
    const label = c.label.toLowerCase();
    const words = label.split(/\s+/);
    const terms = [label, words[words.length - 1]].filter((t) => t.length >= 5);
    const at = Math.min(...terms.map((t) => said.indexOf(t)).filter((i) => i >= 0));
    if (Number.isFinite(at)) hits.push({ id: c.id, at });
  }
  return hits
    .sort((a, b) => a.at - b.at)
    .slice(0, 3)
    .map((h) => h.id);
}
