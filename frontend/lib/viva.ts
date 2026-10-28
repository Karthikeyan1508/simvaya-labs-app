import { call } from './account';

// Viva types and calls, as in the shared contract (section 3 to 5). Ids are numbers.

export type VivaKind = 'explain' | 'mcq' | 'point' | 'step' | 'highlight' | 'calc' | 'graph' | 'formula';

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

export interface Result {
  questionId: number;
  correct: boolean | null;
  score: number | null;
  points: number;
  expected?: string;
  explanation?: string; // the model answer
  feedback?: string | null; // the marker's comment on an explain answer
}

export interface MyAttemptSummary {
  id: number;
  status: 'in_progress' | 'submitted';
  score: number | null;
  pendingReview: boolean;
  submittedAt?: string | null; // optional until the API sends it
}

export type MyViva = VivaSummary & { myAttempt: MyAttemptSummary | null };

export interface MyVivaDetail {
  viva: { id: number; title: string; experimentId: string; status: VivaStatus; maxScore: number; createdAt?: string; submittedAt?: string | null };
  questions: StudentQuestion[];
  attempt: { id: number; status: 'in_progress' | 'submitted'; submittedAt?: string | null; answers: { questionId: number; answer: AnswerPayload }[] } | null;
  results: Result[] | null;
  transcript: TranscriptLine[];
}

export interface NewSelfAssessment {
  id: number;
  source: 'agenticorg' | 'groq' | 'template';
  note?: string;
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

export const listMyVivas = () => request<MyViva[]>('/me/vivas');
export const startSelfAssessment = (experimentId: string) =>
  request<NewSelfAssessment>('/me/vivas/self-assessments', 'POST', { experimentId });
export const abandonViva = (id: number) => request<unknown>(`/me/vivas/${id}`, 'DELETE');
export const getMyViva = (id: number) => request<MyVivaDetail>(`/me/vivas/${id}`);

// Finished attempts only, for the dashboard and the viva list. Max marks come from each viva's detail.
export interface SubmittedViva {
  id: number;
  title: string;
  experimentId: string;
  createdAt: string;
  submittedAt?: string | null;
  score: number | null;
  maxScore: number;
}
export async function listSubmittedVivas(): Promise<SubmittedViva[]> {
  const done = (await listMyVivas()).filter((v) => v.myAttempt?.status === 'submitted');
  const details = await Promise.all(done.map((v) => getMyViva(v.id)));
  return done.map((v, i) => ({
    id: v.id,
    title: v.title,
    experimentId: v.experimentId,
    createdAt: v.createdAt,
    submittedAt: v.myAttempt?.submittedAt ?? details[i].attempt?.submittedAt ?? null,
    score: v.myAttempt?.score ?? null,
    maxScore: details[i].viva.maxScore,
  }));
}
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

// "28 Oct 2026, 3:05 pm" for a stored ISO time.
export const formatWhen = (iso: string) =>
  new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });

// A student's answer as text. `labels` maps part ids to names.
export function formatAnswer(
  q: Pick<StudentQuestion, 'kind' | 'options' | 'unit'>,
  a: AnswerPayload,
  labels: Record<string, string>,
): string {
  if ('text' in a) return a.text || '—';
  if ('option' in a) return q.options?.[a.option] ?? '—';
  if ('partId' in a) return labels[a.partId] ?? a.partId;
  if ('step' in a) return `Step ${a.step}`;
  return `${a.value} ${q.unit ?? ''}`.trim();
}

export const errorMessage = (e: unknown) => (e instanceof Error ? e.message : 'Something went wrong. Try again.');
