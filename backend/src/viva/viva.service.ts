import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import {
  answerRows,
  attemptFor,
  finishAttempt,
  inTransaction,
  insertAttempt,
  insertQuestions,
  insertViva,
  questionRows,
  setTranscript,
  upsertAnswer,
  vivaRow,
  vivasOwnedBy,
  writeGrade,
  type AnswerRow,
  type VivaRow,
  type VivaSummaryRow,
} from '../db/viva-repo';
import { generateSelfAssessment, markExplain, type ExplainResult } from './self-assessment';
import { attemptTotals, gradeAnswer, maxScore, parseAnswer, resultFor, type Graded } from './grading';
import { labFor, type LabViva } from './labs';
import { toStudentQuestion } from './student-view';
import { type DraftQuestion, type Question, type StoredAnswer } from './types';
import type { AnswerDto, SpokenAnswerDto } from './viva.dto';

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

// A student reaches only the self-assessments they own.
async function ownViva(id: number, userId: string): Promise<VivaRow> {
  const v = await vivaRow(id);
  if (!v || v.owner_id !== userId) throw new NotFoundException('Viva not found');
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
      { correct: r.correct === null ? null : r.correct === 1, score: r.score, feedback: r.feedback },
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

// The student's own self-assessment: questions generated (AgenticOrg, then Groq, then templates) and saved as a
// published viva that only this student can open.
export async function createSelfAssessment(experimentId: string, userId: string) {
  const lab = labFor(experimentId);
  const gen = await generateSelfAssessment(lab.counts, lab);
  const t = now();
  const id = await inTransaction(async () => {
    const vivaId = await insertViva(
      userId,
      `Self-assessment, ${t.slice(0, 16).replace('T', ' ')} UTC`,
      experimentId,
      'published',
      t,
      t,
    );
    await insertQuestions(vivaId, gen.questions);
    return vivaId;
  });
  return { id, source: gen.source, note: gen.note };
}

export async function listMyVivas(userId: string) {
  return Promise.all(
    (await vivasOwnedBy(userId)).map(async (r) => {
      const a = await attemptFor(r.id, userId);
      return {
        ...summaryOf(r),
        myAttempt: a ? { id: a.id, status: a.status, score: a.score, pendingReview: a.pending_review === 1 } : null,
      };
    }),
  );
}

export async function startAttempt(vivaId: number, userId: string) {
  const v = await ownViva(vivaId, userId);
  let a = await attemptFor(v.id, userId);
  if (!a) {
    await insertAttempt(v.id, userId, now());
    a = (await attemptFor(v.id, userId))!;
  }
  return { attemptId: a.id, status: a.status, startedAt: a.started_at };
}

export async function studentViva(vivaId: number, userId: string) {
  const v = await ownViva(vivaId, userId);
  const a = await attemptFor(v.id, userId);
  const questions = await questionsOf(v.id);
  const rows = a ? await answerRows(a.id) : [];
  const graded = gradedOf(rows);
  const lab = labFor(v.experiment_id);
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
    results: a?.status === 'submitted' ? questions.map((q) => resultFor(q, graded.get(q.id), lab.parts)) : null,
    transcript: a ? parsedTranscript(a.transcript) : [],
  };
}

export async function saveAnswer(vivaId: number, dto: AnswerDto, userId: string) {
  const v = await ownViva(vivaId, userId);
  const a = await attemptFor(v.id, userId);
  if (!a) throw new ConflictException('Start the viva before answering');
  if (a.status !== 'in_progress') throw new ConflictException('This attempt is already submitted');
  const q = (await questionsOf(v.id)).find((x) => x.id === dto.questionId);
  if (!q) throw new NotFoundException('Question not found');
  const stored = parseAnswer(q, dto.answer, labFor(v.experiment_id).parts);
  if (!stored) throw new BadRequestException('Answer does not fit this question');
  await upsertAnswer(a.id, q.id, JSON.stringify(stored));
  return { ok: true };
}

// Marks each explain answer with Groq, against its model answer. A question Groq does not mark is left out,
// so it stays pending review.
async function markExplainAnswers(
  questions: Question[],
  saved: Map<number, AnswerRow>,
  lab: LabViva,
): Promise<Map<number, ExplainResult>> {
  const marks = new Map<number, ExplainResult>();
  await Promise.all(
    questions
      .filter((q) => q.kind === 'explain')
      .map(async (q) => {
        const stored = parsedAnswer(saved.get(q.id)?.answer ?? null);
        const mark = await markExplain(q, stored && 'text' in stored ? stored.text : '', lab);
        if (mark) marks.set(q.id, mark);
      }),
  );
  return marks;
}

export async function submitAttempt(vivaId: number, userId: string) {
  const v = await ownViva(vivaId, userId);
  const a = await attemptFor(v.id, userId);
  if (!a) throw new ConflictException('Start the viva before submitting');
  if (a.status === 'submitted') throw new ConflictException('This attempt is already submitted');
  const questions = await questionsOf(v.id);
  const lab = labFor(v.experiment_id);
  const saved = new Map((await answerRows(a.id)).map((r) => [r.question_id, r] as const));
  // Marking happens before the transaction, so the database is not held open during the Groq calls.
  const marks = await markExplainAnswers(questions, saved, lab);

  return inTransaction(async () => {
    for (const q of questions) {
      const answer = saved.get(q.id)?.answer ?? null;
      if (q.kind === 'explain') {
        const m = marks.get(q.id);
        await writeGrade(a.id, q.id, answer, m?.correct ?? null, m?.score ?? null, m?.feedback ?? null);
      } else {
        const g = gradeAnswer(q, parsedAnswer(answer), lab.parts);
        await writeGrade(a.id, q.id, answer, g.correct, g.score, null);
      }
    }
    const graded = gradedOf(await answerRows(a.id));
    const totals = attemptTotals(questions, graded);
    await finishAttempt(a.id, now(), totals.score, totals.pendingReview);
    return {
      score: totals.score,
      maxScore: maxScore(questions),
      pendingReview: totals.pendingReview,
      results: questions.map((q) => resultFor(q, graded.get(q.id), lab.parts)),
    };
  });
}

// Oral interview: the examiner agent passes each spoken answer with its question number. The reply is a short
// sentence the agent can say aloud, so a wrong answer asks the student again instead of failing the call.
export async function saveSpokenAnswer(vivaId: number, dto: SpokenAnswerDto, userId: string) {
  const v = await ownViva(vivaId, userId);
  const a = await attemptFor(v.id, userId);
  if (!a) return { ok: false, message: 'The viva has not started yet.' };
  if (a.status !== 'in_progress') return { ok: false, message: 'The viva is already submitted.' };
  const questions = await questionsOf(v.id);
  const q = questions[dto.questionNumber - 1];
  if (!q) return { ok: false, message: `There is no question ${dto.questionNumber}.` };
  const field = SPOKEN_FIELD[q.kind];
  const stored = parseAnswer(q, { [field]: dto[field] }, labFor(v.experiment_id).parts);
  if (!stored) return { ok: false, message: `That does not answer question ${dto.questionNumber}. Ask the student again.` };
  await upsertAnswer(a.id, q.id, JSON.stringify(stored));
  return { ok: true, message: `Saved the answer to question ${dto.questionNumber}.` };
}

// The whole conversation, kept with the attempt so the student can read it with the results.
export async function saveTranscript(vivaId: number, lines: unknown[], userId: string) {
  const v = await ownViva(vivaId, userId);
  const a = await attemptFor(v.id, userId);
  if (!a) throw new ConflictException('Start the viva before saving the interview');
  if (a.status !== 'in_progress') throw new ConflictException('This attempt is already submitted');
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
