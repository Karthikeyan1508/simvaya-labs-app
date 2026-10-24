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
import { generateWithClaude } from './ai-generator';
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
import type { AnswerDto, CreateVivaDto, GradeDto, ProposalDto } from './viva.dto';

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

const summaryById = (id: number) => summaryOf(vivaSummary(id)!);

function ownedViva(id: number, teacherId: string): VivaRow {
  const v = vivaRow(id);
  if (!v || v.teacher_id !== teacherId) throw new NotFoundException('Viva not found');
  return v;
}

// Students see published vivas. Closed ones stay open to finish an attempt already started.
function openViva(id: number): VivaRow {
  const v = vivaRow(id);
  if (!v || v.status === 'draft') throw new NotFoundException('Viva not found');
  return v;
}

const questionsOf = (vivaId: number): Question[] =>
  questionRows(vivaId).map((r) => ({ ...(JSON.parse(r.data) as DraftQuestion), id: r.id }));

const parsedAnswer = (text: string | null): StoredAnswer | null =>
  text === null ? null : (JSON.parse(text) as StoredAnswer);

const gradedOf = (rows: AnswerRow[]) =>
  new Map(
    rows.map((r): [number, Graded] => [
      r.question_id,
      { correct: r.correct === null ? null : r.correct === 1, score: r.score },
    ]),
  );

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

// Teacher proposals. AI mode falls back to templates on any problem and says why in `note`.
export async function proposeQuestions(dto: ProposalDto) {
  const counts = checkCounts(dto.counts);
  const seed = Math.floor(Math.random() * 2 ** 31);
  const templates = (note?: string) => ({
    source: 'template' as const,
    note,
    questions: templateQuestions(counts, seed),
  });
  if (dto.mode !== 'ai') return templates();

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return templates('ANTHROPIC_API_KEY is not set, so templates were used.');
  try {
    const { questions, dropped } = await generateWithClaude({
      apiKey,
      model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-5-5',
      counts,
      instructions: dto.instructions,
    });
    if (questions.length > 0) {
      const want = Object.values(counts).reduce((s, n) => s + (n ?? 0), 0);
      const notes = [
        dropped > 0 ? `${dropped} invalid question(s) were dropped.` : '',
        questions.length < want ? `Claude gave ${questions.length} of ${want} requested questions.` : '',
      ].filter(Boolean);
      return {
        source: 'ai' as const,
        note: notes.length ? notes.join(' ') : undefined,
        questions,
      };
    }
    return templates('Claude returned no valid questions, so templates were used.');
  } catch (err) {
    const why = err instanceof Error ? err.message : 'unknown error';
    log.warn(`AI proposal failed: ${why}`);
    return templates(`Claude could not generate questions (${why}), so templates were used.`);
  }
}

export function createViva(dto: CreateVivaDto, teacherId: string) {
  const questions = parseQuestions(dto.questions);
  if (dto.publish && questions.length === 0) {
    throw new BadRequestException('Add at least one question before publishing');
  }
  const t = now();
  const id = inTransaction(() => {
    const vivaId = insertViva(
      teacherId,
      cleanTitle(dto.title),
      dto.experimentId,
      dto.publish ? 'published' : 'draft',
      dto.publish ? t : null,
      t,
    );
    replaceQuestions(vivaId, questions);
    return vivaId;
  });
  return summaryById(id);
}

export function listTeacherVivas(teacherId: string) {
  return vivasByTeacher(teacherId).map(summaryOf);
}

export function teacherViva(id: number, teacherId: string) {
  const v = ownedViva(id, teacherId);
  const questions = questionsOf(v.id);
  return {
    viva: summaryById(v.id),
    questions,
    attempts: attemptsForViva(v.id).map((a) => attemptView(a, questions)),
  };
}

function attemptView(a: AttemptRow, questions: Question[]) {
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
    answers: answerRows(a.id).map((r) => ({
      questionId: r.question_id,
      answer: parsedAnswer(r.answer),
      correct: r.correct === null ? null : r.correct === 1,
      score: r.score,
    })),
  };
}

export function updateViva(id: number, dto: { title?: string; questions?: unknown[] }, teacherId: string) {
  const v = ownedViva(id, teacherId);
  if (v.status !== 'draft') throw new ConflictException('Only draft vivas can be edited');
  const questions = dto.questions ? parseQuestions(dto.questions) : undefined;
  const title = dto.title === undefined ? undefined : cleanTitle(dto.title);
  inTransaction(() => {
    if (title !== undefined) updateTitle(v.id, title);
    if (questions) replaceQuestions(v.id, questions);
  });
  return summaryById(v.id);
}

export function changeStatus(id: number, status: VivaStatus, teacherId: string) {
  ownedViva(id, teacherId);
  if (status === 'published' && questionRows(id).length === 0) {
    throw new BadRequestException('Add at least one question before publishing');
  }
  setVivaStatus(id, status, status === 'published' ? now() : null);
  return summaryById(id);
}

export function removeViva(id: number, teacherId: string) {
  ownedViva(id, teacherId);
  deleteViva(id);
  return { ok: true };
}

export function gradeAttempt(vivaId: number, attemptId: number, dto: GradeDto, teacherId: string) {
  const v = ownedViva(vivaId, teacherId);
  const a = attemptById(attemptId);
  if (!a || a.viva_id !== v.id) throw new NotFoundException('Attempt not found');
  if (a.status !== 'submitted') throw new ConflictException('Only submitted attempts can be graded');
  const questions = questionsOf(v.id);
  const q = questions.find((x) => x.id === dto.questionId);
  if (!q) throw new NotFoundException('Question not found');
  if (dto.score < 0 || dto.score > q.points) throw new BadRequestException(`Score must be between 0 and ${q.points}`);

  inTransaction(() => {
    setAnswerScore(a.id, q.id, dto.score);
    const totals = attemptTotals(questions, gradedOf(answerRows(a.id)));
    setAttemptScore(a.id, totals.score, totals.pendingReview);
  });
  return { ok: true };
}

export function listOpenVivas(userId: string) {
  return vivasPublished().map((r) => {
    const a = attemptFor(r.id, userId);
    return {
      ...summaryOf(r),
      myAttempt: a ? { id: a.id, status: a.status, score: a.score, pendingReview: a.pending_review === 1 } : null,
    };
  });
}

export function startAttempt(vivaId: number, userId: string) {
  const v = openViva(vivaId);
  let a = attemptFor(v.id, userId);
  if (!a) {
    if (v.status !== 'published') throw new NotFoundException('Viva is not open');
    insertAttempt(v.id, userId, now());
    a = attemptFor(v.id, userId)!;
  }
  return { attemptId: a.id, status: a.status, startedAt: a.started_at };
}

export function studentViva(vivaId: number, userId: string) {
  const v = openViva(vivaId);
  const a = attemptFor(v.id, userId);
  if (!a && v.status !== 'published') throw new NotFoundException('Viva is not open');
  const questions = questionsOf(v.id);
  const rows = a ? answerRows(a.id) : [];
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
  };
}

export function saveAnswer(vivaId: number, dto: AnswerDto, userId: string) {
  const v = openViva(vivaId);
  const a = attemptFor(v.id, userId);
  if (!a) throw new ConflictException('Start the viva before answering');
  if (a.status !== 'in_progress') throw new ConflictException('This attempt is already submitted');
  const q = questionsOf(v.id).find((x) => x.id === dto.questionId);
  if (!q) throw new NotFoundException('Question not found');
  const stored = parseAnswer(q, dto.answer);
  if (!stored) throw new BadRequestException('Answer does not fit this question');
  upsertAnswer(a.id, q.id, JSON.stringify(stored));
  return { ok: true };
}

export function submitAttempt(vivaId: number, userId: string) {
  const v = openViva(vivaId);
  const a = attemptFor(v.id, userId);
  if (!a) throw new ConflictException('Start the viva before submitting');
  if (a.status === 'submitted') throw new ConflictException('This attempt is already submitted');
  const questions = questionsOf(v.id);

  return inTransaction(() => {
    const saved = new Map(answerRows(a.id).map((r) => [r.question_id, r] as const));
    for (const q of questions) {
      const row = saved.get(q.id);
      const g = gradeAnswer(q, parsedAnswer(row?.answer ?? null));
      writeGrade(a.id, q.id, row?.answer ?? null, g.correct, g.score);
    }
    const graded = gradedOf(answerRows(a.id));
    const totals = attemptTotals(questions, graded);
    finishAttempt(a.id, now(), totals.score, totals.pendingReview);
    return {
      score: totals.score,
      maxScore: maxScore(questions),
      pendingReview: totals.pendingReview,
      results: questions.map((q) => resultFor(q, graded.get(q.id))),
    };
  });
}
