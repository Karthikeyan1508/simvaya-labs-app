import { call } from './account';

// Viva types and calls, as in the shared contract (section 3 to 5). Ids are numbers.

export type VivaKind = 'explain' | 'mcq' | 'point' | 'step' | 'highlight' | 'calc' | 'graph' | 'formula';
export const VIVA_KINDS: VivaKind[] = ['explain', 'mcq', 'point', 'step', 'highlight', 'calc', 'graph', 'formula'];

export const KIND_LABEL: Record<VivaKind, string> = {
  explain: 'Explain',
  mcq: 'Multiple choice',
  point: 'Point at a part',
  step: 'Procedure step',
  highlight: 'Name a highlighted part',
  calc: 'Calculation',
  graph: 'Read a graph',
  formula: 'Pick a formula',
};

export type VivaStatus = 'draft' | 'published' | 'closed';

export interface DraftQuestion {
  id?: number;
  kind: VivaKind;
  prompt: string;
  points: number;
  options?: string[];
  answer?: number;
  partId?: string;
  step?: number;
  expected?: number;
  tolerance?: number;
  unit?: string;
  graph?: { x: number[]; y: number[]; xLabel: string; yLabel: string; peakX?: number };
  explanation?: string;
  source?: 'template' | 'ai' | 'agenticorg' | 'manual';
}

export interface StudentQuestion {
  id: number;
  kind: VivaKind;
  prompt: string;
  points: number;
  options?: string[];
  unit?: string;
  graph?: { x: number[]; y: number[]; xLabel: string; yLabel: string };
  highlightPartId?: string;
}

export interface VivaSummary {
  id: number;
  title: string;
  experimentId: string;
  status: VivaStatus;
  questionCount: number;
  attemptCount: number;
  submittedCount: number;
  createdAt: string;
  publishedAt: string | null;
}

export type AnswerPayload =
  | { text: string }
  | { option: number }
  | { partId: string }
  | { step: number }
  | { value: number };

export interface TranscriptLine {
  role: 'examiner' | 'student';
  text: string;
  at: string;
}

export interface Attempt {
  id: number;
  studentName: string;
  studentEmail: string;
  status: 'in_progress' | 'submitted';
  startedAt: string;
  submittedAt: string | null;
  score: number | null;
  maxScore: number;
  pendingReview: boolean;
  transcript: TranscriptLine[];
  answers: { questionId: number; answer: AnswerPayload; correct: boolean | null; score: number | null }[];
}

export interface TeacherViva {
  viva: VivaSummary;
  questions: DraftQuestion[];
  attempts: Attempt[];
}

export interface Proposals {
  source: 'template' | 'ai' | 'agenticorg';
  note?: string;
  questions: DraftQuestion[];
}

export interface Result {
  questionId: number;
  correct: boolean | null;
  score: number | null;
  points: number;
  expected?: string;
  explanation?: string;
}

export interface MyAttemptSummary {
  id: number;
  status: 'in_progress' | 'submitted';
  score: number | null;
  pendingReview: boolean;
}

export type MyViva = VivaSummary & { myAttempt: MyAttemptSummary | null };

export interface MyVivaDetail {
  viva: { id: number; title: string; experimentId: string; status: VivaStatus; maxScore: number };
  questions: StudentQuestion[];
  attempt: { id: number; status: 'in_progress' | 'submitted'; answers: { questionId: number; answer: AnswerPayload }[] } | null;
  results: Result[] | null;
  transcript: TranscriptLine[];
}

// One spoken answer, as the examiner agent sends it. questionNumber counts from 1.
export interface SpokenAnswer {
  questionNumber: number;
  text?: string;
  option?: number;
  value?: number;
  step?: number;
  partId?: string;
}

export interface SubmitResult {
  score: number;
  maxScore: number;
  pendingReview: boolean;
  results: Result[];
}

// Same request path as the rest of the app: one helper, one token, one error type.
function request<T>(path: string, method = 'GET', data?: unknown): Promise<T> {
  return call<T>(path, { method, body: data === undefined ? undefined : JSON.stringify(data) });
}

// Teacher
export const proposeQuestions = (body: {
  experimentId: string;
  mode: 'template' | 'ai' | 'agenticorg';
  counts: Partial<Record<VivaKind, number>>;
  instructions?: string;
}) => request<Proposals>('/viva/proposals', 'POST', body);
export const createViva = (body: { title: string; experimentId: string; questions: DraftQuestion[]; publish: boolean }) =>
  request<VivaSummary>('/vivas', 'POST', body);
export const listVivas = () => request<VivaSummary[]>('/vivas');
export const getViva = (id: number) => request<TeacherViva>(`/vivas/${id}`);
export const updateVivaQuestions = (id: number, questions: DraftQuestion[]) =>
  request<unknown>(`/vivas/${id}`, 'PUT', { questions });
export const setVivaStatus = (id: number, status: VivaStatus) =>
  request<VivaSummary>(`/vivas/${id}/status`, 'PATCH', { status });
export const gradeAnswer = (vivaId: number, attemptId: number, body: { questionId: number; score: number }) =>
  request<{ ok: true }>(`/vivas/${vivaId}/attempts/${attemptId}/grade`, 'POST', body);

// Student
export const listMyVivas = () => request<MyViva[]>('/me/vivas');
export const getMyViva = (id: number) => request<MyVivaDetail>(`/me/vivas/${id}`);
export const startViva = (id: number) =>
  request<{ attemptId: number; status: string; startedAt: string }>(`/me/vivas/${id}/start`, 'POST');
export const saveAnswer = (id: number, questionId: number, answer: AnswerPayload) =>
  request<unknown>(`/me/vivas/${id}/answers`, 'PUT', { questionId, answer });
export const submitViva = (id: number) => request<SubmitResult>(`/me/vivas/${id}/submit`, 'POST');
// Oral interview. The examiner's tool replies with a short message the agent says aloud.
export const saveSpokenAnswer = (id: number, body: SpokenAnswer) =>
  request<{ ok: boolean; message: string }>(`/me/vivas/${id}/spoken-answer`, 'POST', body);
export const saveTranscript = (id: number, transcript: TranscriptLine[]) =>
  request<{ ok: boolean }>(`/me/vivas/${id}/transcript`, 'PUT', { transcript });

// Pure helpers

export const STATUS_LABEL: Record<VivaStatus, string> = { draft: 'Draft', published: 'Published', closed: 'Closed' };

// A blank question of the given kind, ready to edit. `firstPart` is the default part id for point and highlight.
export function blankQuestion(kind: VivaKind, firstPart = ''): DraftQuestion {
  const base = { kind, prompt: '', points: 1, source: 'manual' as const };
  switch (kind) {
    case 'explain':
      return { ...base, explanation: '' };
    case 'mcq':
    case 'formula':
      return { ...base, options: ['', '', '', ''], answer: 0 };
    case 'point':
    case 'highlight':
      return { ...base, partId: firstPart };
    case 'step':
      return { ...base, step: 1 };
    case 'calc':
      return { ...base, expected: 0, tolerance: 0.05, unit: '' };
    case 'graph':
      return { ...base, expected: 0, tolerance: 0.05, unit: '', graph: { x: [], y: [], xLabel: '', yLabel: '' } };
  }
}

// The first problem with a question, or null. The backend validates too; this only gives the teacher a clear message early.
export function questionProblem(q: DraftQuestion): string | null {
  if (!q.prompt.trim()) return 'Write the prompt.';
  if (!(q.points >= 0)) return 'Points must be 0 or more.';
  if (q.kind === 'mcq' || q.kind === 'formula') {
    const opts = q.options ?? [];
    if (opts.length < 2 || opts.some((o) => !o.trim())) return 'Fill in every option (at least two).';
    if (q.answer === undefined || q.answer < 0 || q.answer >= opts.length) return 'Mark the correct option.';
  }
  if ((q.kind === 'point' || q.kind === 'highlight') && !q.partId) return 'Pick a part.';
  if (q.kind === 'step' && !(q.step !== undefined && q.step >= 1 && q.step <= 9)) return 'Pick a step from 1 to 9.';
  if (q.kind === 'calc' || q.kind === 'graph') {
    if (q.expected === undefined || !Number.isFinite(q.expected)) return 'Enter the expected value.';
    if (!(q.tolerance !== undefined && q.tolerance >= 0)) return 'Tolerance must be 0 or more.';
  }
  if (q.kind === 'graph') {
    const g = q.graph;
    if (!g || g.x.length < 2 || g.x.length !== g.y.length) return 'Graph needs at least two x and y values, same count.';
  }
  return null;
}

// A student's answer as text. `labels` maps part ids to names.
export function formatAnswer(
  q: Pick<DraftQuestion, 'kind' | 'options' | 'unit'>,
  a: AnswerPayload,
  labels: Record<string, string>,
): string {
  if ('text' in a) return a.text || '—';
  if ('option' in a) return q.options?.[a.option] ?? '—';
  if ('partId' in a) return labels[a.partId] ?? a.partId;
  if ('step' in a) return `Step ${a.step}`;
  return `${a.value} ${q.unit ?? ''}`.trim();
}

// What the answer key says, for the teacher. `labels` maps part ids to names.
export function answerKeyText(q: DraftQuestion, labels: Record<string, string>): string {
  switch (q.kind) {
    case 'explain':
      return q.explanation ? `Marking note: ${q.explanation}` : 'Graded by hand';
    case 'mcq':
    case 'formula':
      return q.options?.[q.answer ?? -1] ?? '—';
    case 'point':
    case 'highlight':
      return q.partId ? (labels[q.partId] ?? q.partId) : '—';
    case 'step':
      return `Step ${q.step ?? '—'}`;
    case 'calc':
    case 'graph':
      return `${q.expected ?? '—'} ${q.unit ?? ''} ± ${Math.round((q.tolerance ?? 0) * 100)}%`.trim();
  }
}

export const errorMessage = (e: unknown) => (e instanceof Error ? e.message : 'Something went wrong. Try again.');
