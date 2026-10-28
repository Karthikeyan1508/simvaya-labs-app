import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { SORTING_VISUALISER } from './sorting-visualiser/sorting-visualiser.content';
import { ZENER_REGULATOR } from './zener-regulator/zener-regulator.content';

// The backend copies the lab text from the frontend (viva facts). This fails when a copied string no longer
// appears in the frontend source. Strings are compared, not syntax: whitespace is collapsed, escapes and minus signs unified.
// shortcut: checks backend -> frontend only, so text added on the frontend alone is not flagged.
const FRONT = join(__dirname, '..', '..', '..', 'frontend');
const norm = (s: string) => s.replace(/\\'/g, "'").replace(/[−–]/g, '-').replace(/\s+/g, ' ').trim();
const src = (...p: string[]) => norm(readFileSync(join(FRONT, ...p), 'utf8'));

function strings(v: unknown, out: string[] = []): string[] {
  if (typeof v === 'string') out.push(v);
  else if (Array.isArray(v)) v.forEach((x) => strings(x, out));
  else if (v && typeof v === 'object') Object.values(v).forEach((x) => strings(x, out));
  return out;
}

const missing = (text: string, ss: string[]) => ss.filter((s) => !text.includes(norm(s)));

describe('Zener lab text matches the frontend', () => {
  const text = src('lib', 'zener', 'content.ts') + src('lib', 'zener', 'wiring.ts');
  const { id, formulas, ...copied } = ZENER_REGULATOR;
  it('title, aim, theory, steps and parts', () => {
    expect(missing(text, strings(copied))).toEqual([]);
  });
  it('formulas', () => {
    expect(missing(text, formulas.map((f) => f.formula))).toEqual([]);
  });
});

describe('Sorting lab text matches the frontend', () => {
  const theory = src('components', 'sorting', 'sort-theory.tsx');
  const quiz = src('components', 'sorting', 'sort-quiz.ts');
  it('theory paragraphs and equations', () => {
    const { theory: paras, equations } = SORTING_VISUALISER;
    expect(missing(theory, [...paras, ...strings(equations)])).toEqual([]);
  });
  it('quiz questions, options, explanations and answer index', () => {
    const { quiz: qs } = SORTING_VISUALISER;
    expect(missing(quiz, strings(qs.map(({ answer, ...q }) => q)))).toEqual([]);
    expect(quiz.match(/ q: /g)?.length).toBe(qs.length);
    for (const q of qs) {
      const from = quiz.slice(quiz.indexOf(norm(q.q)));
      expect(from.match(/answer: (\d+)/)?.[1]).toBe(String(q.answer));
    }
  });
  it('title and aim exist on the frontend', () => {
    const all = src('components', 'sorting', 'sorting-lab.tsx') + src('lib', 'voice-sorting.ts');
    expect(missing(all, [SORTING_VISUALISER.title, SORTING_VISUALISER.aim])).toEqual([]);
  });
});
