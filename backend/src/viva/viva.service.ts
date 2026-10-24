import { BadRequestException, ConflictException, Logger, NotFoundException } from '@nestjs/common';
import {
  answerRows,
  attemptById,
  attemptFor,
  attemptsForViva,
  deleteViva,
  finishAttempt,
  inTransaction,
  insertAttempt,
  insertViva,
  questionRows,
  replaceQuestions,
  setAnswerScore,
  setAttemptScore,
  setTranscript,
  setVivaStatus,
  updateTitle,
  upsertAnswer,
  vivaRow,
  vivaSummary,
  vivasByTeacher,
  vivasPublished,
  writeGrade,
  type AnswerRow,
  type AttemptRow,
  type VivaRow,
  type VivaSummaryRow,
} from '../db/viva-repo';
import { generateWithGroq } from './groq-generator';
import { agenticOrgConfig, runAgent } from '../agenticorg/agenticorg';
import { parseDraft } from './draft';
import { attemptTotals, gradeAnswer, maxScore, parseAnswer, resultFor, type Graded } from './grading';
import { templateQuestions, type Counts } from './question-bank';
import { toStudentQuestion } from './student-view';
import {
  VIVA_KINDS,
  type DraftQuestion,
  type Question,
  type StoredAnswer,
  type VivaKind,
  type VivaStatus,
} from './types';
import type { AnswerDto, CreateVivaDto, GradeDto, ProposalDto, SpokenAnswerDto } from './viva.dto';

const log = new Logger('Viva');
const now = () => new Date().toISOString();

export function summaryOf(r: VivaSummaryRow) {
  return {
    id: r.id,
    title: r.title,
    experimentId: r.experiment_id,
    status: r.status,
    questionCount: r.question_count,
    attemptCount: r.attempt_count,
    submittedCount: r.submitted_count,
    createdAt: r.created_at,
    publishedAt: r.published_at,
  };
}

const summaryById = async (id: number) => summaryOf((await vivaSummary(id))!);

async function ownedViva(id: number, teacherId: string): Promise<VivaRow> {
  const v = await vivaRow(id);
  if (!v || v.teacher_id !== teacherId) throw new NotFoundException('Viva not found');
  return v;
}

// Students see published vivas. Closed ones stay open to finish an attempt already started.
async function openViva(id: number): Promise<VivaRow> {
  const v = await vivaRow(id);
  if (!v || v.status === 'draft') throw new NotFoundException('Viva not found');
  return v;
}

const questionsOf = async (vivaId: number): Promise<Question[]> =>
  (await questionRows(vivaId)).map((r) => ({ ...(JSON.parse(r.data) as DraftQuestion), id: r.id }));

const parsedAnswer = (text: string | null): StoredAnswer | null =>
  text === null ? null : (JSON.parse(text) as StoredAnswer);

const gradedOf = (rows: AnswerRow[]) =>
  new Map(
    rows.map((r): [number, Graded] => [
      r.question_id,
      { correct: r.correct === null ? null : r.correct === 1, score: r.score },
    ]),
  );

// The transcript is stored as JSON. Anything that is not a well-formed line is dropped on read.
export type TranscriptLine = { role: 'examiner' | 'student'; text: string; at: string };
const parsedTranscript = (text: string | null): TranscriptLine[] => {
  if (!text) return [];
  try {
    return (JSON.parse(text) as TranscriptLine[]).filter((l) => l && typeof l.text === 'string');
  } catch {
    return [];
  }
};

// Which spoken field carries the answer for each question kind. Same shapes as parseAnswer.
const SPOKEN_FIELD = {
  explain: 'text',
  highlight: 'text',
  mcq: 'option',
  formula: 'option',
  point: 'partId',
  step: 'step',
  calc: 'value',
  graph: 'value',
} as const;

// Checks each question. A numeric id is kept so an edit can keep the question's identity.
function parseQuestions(raw: unknown[]): DraftQuestion[] {
  return raw.map((item, i) => {
    const q = parseDraft(item);
    if (typeof q === 'string') throw new BadRequestException(`Question ${i + 1}: ${q}`);
    const id = (item as { id?: unknown }).id;
    return Number.isInteger(id) ? { ...q, id: id as number } : q;
  });
}

function cleanTitle(title: string): string {
  const t = title.trim();
  if (!t) throw new BadRequestException('Title is required');
  return t;
}

function checkCounts(raw: Record<string, unknown>): Counts {
  const counts: Counts = {};
  let total = 0;
  for (const [kind, n] of Object.entries(raw)) {
    if (!(VIVA_KINDS as readonly string[]).includes(kind)) throw new BadRequestException(`Unknown question kind: ${kind}`);
    if (typeof n !== 'number' || !Number.isInteger(n) || n < 0 || n > 20) {
      throw new BadRequestException(`Count for ${kind} must be a whole number from 0 to 20`);
    }
    counts[kind as VivaKind] = n;
    total += n;
  }
  if (total === 0) throw new BadRequestException('Ask for at least one question');
  if (total > 60) throw new BadRequestException('At most 60 questions per proposal');
  return counts;
}

function draftTask(counts: Counts, instructions?: string): string {
  const asked = Object.entries(counts)
    .map(([kind, n]) => `${n} ${kind}`)
    .join(', ');
  return [
    'Write viva questions for a virtual engineering lab as JSON only: {"questions":[...]}.',
    `Each question has kind (one of ${VIVA_KINDS.join(', ')}), prompt, points (a whole number) and the fields its kind needs.`,
    `Ask for: ${asked}.`,
    instructions ? `Teacher's instructions: ${instructions}` : '',
  ]
    .filter(Boolean)
    .join('\n');
}

// The agent's output may be an object with questions, or the same JSON as text.
function questionsFromOutput(output: unknown): unknown[] {
  if (typeof output === 'string') return questionsFromOutput(tryJson(output));
  if (output && typeof output === 'object') {
    const o = output as { questions?: unknown; text?: unknown };
    if (Array.isArray(o.questions)) return o.questions;
    if (typeof o.text === 'string') return questionsFromOutput(tryJson(o.text));
  }
  return [];
}

const tryJson = (s: string): unknown => {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
};

// Proposals from an AgenticOrg agent. They are drafts only: the teacher edits and publishes them.
async function agenticOrgProposal(
  counts: Counts,
  instructions: string | undefined,
  templates: (note?: string) => { source: 'template'; note?: string; questions: DraftQuestion[] },
) {
  const cfg = agenticOrgConfig();
  const agentId = process.env.AGENTICORG_VIVA_AGENT_ID;
  if (!cfg || !agentId) {
    return templates('AgenticOrg is not set up (AGENTICORG_API_KEY and AGENTICORG_VIVA_AGENT_ID), so templates were used.');
  }
  try {
    const run = await runAgent(cfg, agentId, { task: draftTask(counts, instructions) });
    // hitl_triggered: AgenticOrg held the run (shadow agents always do). The output is still a draft for the teacher.
    if (run.status !== 'completed' && run.status !== 'hitl_triggered') {
      return templates(`The AgenticOrg run ended with status ${run.status}, so templates were used.`);
    }
    const parsed = questionsFromOutput(run.output).map((item) => parseDraft(item));
    const questions = parsed.filter((q): q is DraftQuestion => typeof q !== 'string');
    if (questions.length === 0) return templates('AgenticOrg returned no valid questions, so templates were used.');
    const dropped = parsed.length - questions.length;
    const notes = [
      run.status === 'hitl_triggered' ? 'AgenticOrg held this run for approval. Check the drafts before publishing.' : '',
      dropped > 0 ? `${dropped} invalid question(s) were dropped.` : '',
    ].filter(Boolean);
    return {
      source: 'agenticorg' as const,
      note: notes.length ? notes.join(' ') : undefined,
      questions,
    };
  } catch (err) {
    const why = err instanceof Error ? err.message : 'unknown error';
    log.warn(`AgenticOrg proposal failed: ${why}`);
    return templates(`AgenticOrg could not produce questions (${why}), so templates were used.`);
  }
}

// Teacher proposals. AI mode falls back to templates on any problem and says why in `note`.
export async function proposeQuestions(dto: ProposalDto) {
  const counts = checkCounts(dto.counts);
  const seed = Math.floor(Math.random() * 2 ** 31);
  const templates = (note?: string) => ({
    source: 'template' as const,
    note,
    questions: templateQuestions(counts, seed),
  });
  if (dto.mode === 'agenticorg') return agenticOrgProposal(counts, dto.instructions, templates);
  if (dto.mode !== 'ai') return templates();

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return templates('GROQ_API_KEY is not set, so templates were used.');
  try {
    const { questions, dropped } = await generateWithGroq({
      apiKey,
      model: process.env.GROQ_MODEL,
      counts,
      instructions: dto.instructions,
    });
    if (questions.length > 0) {
      const want = Object.values(counts).reduce((s, n) => s + (n ?? 0), 0);
      const notes = [
        dropped > 0 ? `${dropped} invalid question(s) were dropped.` : '',
        questions.length < want ? `Groq gave ${questions.length} of ${want} requested questions.` : '',
      ].filter(Boolean);
      return {
        source: 'ai' as const,
        note: notes.length ? notes.join(' ') : undefined,
        questions,
      };
    }
    return templates('Groq returned no valid questions, so templates were used.');
  } catch (err) {
    const why = err instanceof Error ? err.message : 'unknown error';
    log.warn(`AI proposal failed: ${why}`);
    return templates(`Groq could not generate questions (${why}), so templates were used.`);
  }
}

export async function createViva(dto: CreateVivaDto, teacherId: string) {
  const questions = parseQuestions(dto.questions);
  if (dto.publish && questions.length === 0) {
    throw new BadRequestException('Add at least one question before publishing');
  }
  const t = now();
  const id = await inTransaction(async () => {
    const vivaId = await insertViva(
      teacherId,
      cleanTitle(dto.title),
      dto.experimentId,
      dto.publish ? 'published' : 'draft',
      dto.publish ? t : null,
      t,
    );
    await replaceQuestions(vivaId, questions);
    return vivaId;
  });
  return summaryById(id);
}

export async function listTeacherVivas(teacherId: string) {
  return (await vivasByTeacher(teacherId)).map(summaryOf);
}

export async function teacherViva(id: number, teacherId: string) {
  const v = await ownedViva(id, teacherId);
  const questions = await questionsOf(v.id);
  const attempts = await attemptsForViva(v.id);
  return {
    viva: await summaryById(v.id),
    questions,
    attempts: await Promise.all(attempts.map((a) => attemptView(a, questions))),
  };
}

async function attemptView(a: AttemptRow, questions: Question[]) {
  return {
    id: a.id,
    studentName: a.student_name ?? '',
    studentEmail: a.student_email ?? '',
    status: a.status,
    startedAt: a.started_at,
    submittedAt: a.submitted_at,
    score: a.score,
    maxScore: maxScore(questions),
    pendingReview: a.pending_review === 1,
    transcript: parsedTranscript(a.transcript),
    answers: (await answerRows(a.id)).map((r) => ({
      questionId: r.question_id,
      answer: parsedAnswer(r.answer),
      correct: r.correct === null ? null : r.correct === 1,
      score: r.score,
    })),
  };
}

export async function updateViva(id: number, dto: { title?: string; questions?: unknown[] }, teacherId: string) {
  const v = await ownedViva(id, teacherId);
  if (v.status !== 'draft') throw new ConflictException('Only draft vivas can be edited');
  const questions = dto.questions ? parseQuestions(dto.questions) : undefined;
  const title = dto.title === undefined ? undefined : cleanTitle(dto.title);
  await inTransaction(async () => {
    if (title !== undefined) await updateTitle(v.id, title);
    if (questions) await replaceQuestions(v.id, questions);
  });
  return summaryById(v.id);
}

export async function changeStatus(id: number, status: VivaStatus, teacherId: string) {
  await ownedViva(id, teacherId);
  if (status === 'published' && (await questionRows(id)).length === 0) {
    throw new BadRequestException('Add at least one question before publishing');
  }
  await setVivaStatus(id, status, status === 'published' ? now() : null);
  return summaryById(id);
}

export async function removeViva(id: number, teacherId: string) {
  await ownedViva(id, teacherId);
  await deleteViva(id);
  return { ok: true };
}

export async function gradeAttempt(vivaId: number, attemptId: number, dto: GradeDto, teacherId: string) {
  const v = await ownedViva(vivaId, teacherId);
  const a = await attemptById(attemptId);
  if (!a || a.viva_id !== v.id) throw new NotFoundException('Attempt not found');
  if (a.status !== 'submitted') throw new ConflictException('Only submitted attempts can be graded');
  const questions = await questionsOf(v.id);
  const q = questions.find((x) => x.id === dto.questionId);
  if (!q) throw new NotFoundException('Question not found');
  if (dto.score < 0 || dto.score > q.points) throw new BadRequestException(`Score must be between 0 and ${q.points}`);

  await inTransaction(async () => {
    await setAnswerScore(a.id, q.id, dto.score);
    const totals = attemptTotals(questions, gradedOf(await answerRows(a.id)));
    await setAttemptScore(a.id, totals.score, totals.pendingReview);
  });
  return { ok: true };
}

export async function listOpenVivas(userId: string) {
  return Promise.all(
    (await vivasPublished()).map(async (r) => {
      const a = await attemptFor(r.id, userId);
      return {
        ...summaryOf(r),
        myAttempt: a ? { id: a.id, status: a.status, score: a.score, pendingReview: a.pending_review === 1 } : null,
      };
    }),
  );
}

export async function startAttempt(vivaId: number, userId: string) {
  const v = await openViva(vivaId);
  let a = await attemptFor(v.id, userId);
  if (!a) {
    if (v.status !== 'published') throw new NotFoundException('Viva is not open');
    await insertAttempt(v.id, userId, now());
    a = (await attemptFor(v.id, userId))!;
  }
  return { attemptId: a.id, status: a.status, startedAt: a.started_at };
}

export async function studentViva(vivaId: number, userId: string) {
  const v = await openViva(vivaId);
  const a = await attemptFor(v.id, userId);
  if (!a && v.status !== 'published') throw new NotFoundException('Viva is not open');
  const questions = await questionsOf(v.id);
  const rows = a ? await answerRows(a.id) : [];
  const graded = gradedOf(rows);
  return {
    viva: { id: v.id, title: v.title, experimentId: v.experiment_id, status: v.status, maxScore: maxScore(questions) },
    questions: questions.map((q) => toStudentQuestion(q)),
    attempt: a
      ? {
          id: a.id,
          status: a.status,
          answers: rows
            .filter((r) => r.answer !== null)
            .map((r) => ({ questionId: r.question_id, answer: parsedAnswer(r.answer) })),
        }
      : null,
    results: a?.status === 'submitted' ? questions.map((q) => resultFor(q, graded.get(q.id))) : null,
    transcript: a ? parsedTranscript(a.transcript) : [],
  };
}

export async function saveAnswer(vivaId: number, dto: AnswerDto, userId: string) {
  const v = await openViva(vivaId);
  const a = await attemptFor(v.id, userId);
  if (!a) throw new ConflictException('Start the viva before answering');
  if (a.status !== 'in_progress') throw new ConflictException('This attempt is already submitted');
  const q = (await questionsOf(v.id)).find((x) => x.id === dto.questionId);
  if (!q) throw new NotFoundException('Question not found');
  const stored = parseAnswer(q, dto.answer);
  if (!stored) throw new BadRequestException('Answer does not fit this question');
  await upsertAnswer(a.id, q.id, JSON.stringify(stored));
  return { ok: true };
}

export async function submitAttempt(vivaId: number, userId: string) {
  const v = await openViva(vivaId);
  const a = await attemptFor(v.id, userId);
  if (!a) throw new ConflictException('Start the viva before submitting');
  if (a.status === 'submitted') throw new ConflictException('This attempt is already submitted');
  const questions = await questionsOf(v.id);

  return inTransaction(async () => {
    const saved = new Map((await answerRows(a.id)).map((r) => [r.question_id, r] as const));
    for (const q of questions) {
      const row = saved.get(q.id);
      const g = gradeAnswer(q, parsedAnswer(row?.answer ?? null));
      await writeGrade(a.id, q.id, row?.answer ?? null, g.correct, g.score);
    }
    const graded = gradedOf(await answerRows(a.id));
    const totals = attemptTotals(questions, graded);
    await finishAttempt(a.id, now(), totals.score, totals.pendingReview);
    return {
      score: totals.score,
      maxScore: maxScore(questions),
      pendingReview: totals.pendingReview,
      results: questions.map((q) => resultFor(q, graded.get(q.id))),
    };
  });
}

// Oral interview: the examiner agent passes each spoken answer with its question number. The reply is a short
// sentence the agent can say aloud, so a wrong answer asks the student again instead of failing the call.
export async function saveSpokenAnswer(vivaId: number, dto: SpokenAnswerDto, userId: string) {
  const v = await openViva(vivaId);
  const a = await attemptFor(v.id, userId);
  if (!a) return { ok: false, message: 'The viva has not started yet.' };
  if (a.status !== 'in_progress') return { ok: false, message: 'The viva is already submitted.' };
  const questions = await questionsOf(v.id);
  const q = questions[dto.questionNumber - 1];
  if (!q) return { ok: false, message: `There is no question ${dto.questionNumber}.` };
  const field = SPOKEN_FIELD[q.kind];
  const stored = parseAnswer(q, { [field]: dto[field] });
  if (!stored) return { ok: false, message: `That does not answer question ${dto.questionNumber}. Ask the student again.` };
  await upsertAnswer(a.id, q.id, JSON.stringify(stored));
  return { ok: true, message: `Saved the answer to question ${dto.questionNumber}.` };
}

// The whole conversation, kept with the attempt for the teacher to read next to the marks.
export async function saveTranscript(vivaId: number, lines: unknown[], userId: string) {
  const v = await openViva(vivaId);
  const a = await attemptFor(v.id, userId);
  if (!a) throw new ConflictException('Start the viva before saving the interview');
  const clean: TranscriptLine[] = [];
  for (const item of lines) {
    const l = item as { role?: unknown; text?: unknown; at?: unknown };
    if ((l.role !== 'examiner' && l.role !== 'student') || typeof l.text !== 'string') {
      throw new BadRequestException('Each transcript line needs a role and text');
    }
    clean.push({
      role: l.role,
      text: l.text.slice(0, 2000),
      at: typeof l.at === 'string' ? l.at.slice(0, 40) : now(),
    });
  }
  await setTranscript(a.id, JSON.stringify(clean));
  return { ok: true };
}
