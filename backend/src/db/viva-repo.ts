import { one, query, run, inTransaction } from './db';
import type { DraftQuestion, VivaStatus } from '../viva/types';

export { inTransaction };

export interface VivaRow {
  id: number;
  teacher_id: string;
  title: string;
  experiment_id: string;
  status: VivaStatus;
  created_at: string;
  published_at: string | null;
}

export interface VivaSummaryRow extends VivaRow {
  question_count: number;
  attempt_count: number;
  submitted_count: number;
}

export interface QuestionRow {
  id: number;
  data: string;
}

export interface AttemptRow {
  id: number;
  viva_id: number;
  user_id: string;
  status: 'in_progress' | 'submitted';
  started_at: string;
  submitted_at: string | null;
  score: number | null;
  pending_review: number;
  transcript: string | null;
  student_name?: string;
  student_email?: string;
}

export interface AnswerRow {
  attempt_id: number;
  question_id: number;
  answer: string | null;
  correct: number | null;
  score: number | null;
}

// One row per viva with its counts. Used by the teacher and student lists.
const SUMMARY_SQL = `SELECT v.*,
    (SELECT COUNT(*)::int FROM viva_questions q WHERE q.viva_id = v.id) AS question_count,
    (SELECT COUNT(*)::int FROM viva_attempts a WHERE a.viva_id = v.id) AS attempt_count,
    (SELECT COUNT(*)::int FROM viva_attempts a WHERE a.viva_id = v.id AND a.status = 'submitted') AS submitted_count
  FROM vivas v`;

export const vivaRow = (id: number) => one<VivaRow>('SELECT * FROM vivas WHERE id = $1', [id]);

export const vivaSummary = (id: number) => one<VivaSummaryRow>(`${SUMMARY_SQL} WHERE v.id = $1`, [id]);

export const vivasByTeacher = (teacherId: string) =>
  query<VivaSummaryRow>(`${SUMMARY_SQL} WHERE v.teacher_id = $1 ORDER BY v.id DESC`, [teacherId]);

export const vivasPublished = () =>
  query<VivaSummaryRow>(`${SUMMARY_SQL} WHERE v.status = 'published' ORDER BY v.published_at DESC, v.id DESC`);

export async function insertViva(
  teacherId: string,
  title: string,
  experimentId: string,
  status: VivaStatus,
  publishedAt: string | null,
  createdAt: string,
): Promise<number> {
  const [row] = await query<{ id: number }>(
    'INSERT INTO vivas (teacher_id, title, experiment_id, status, created_at, published_at) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
    [teacherId, title, experimentId, status, createdAt, publishedAt],
  );
  return row.id;
}

export const updateTitle = (id: number, title: string) => run('UPDATE vivas SET title = $1 WHERE id = $2', [title, id]);

// published_at is kept from the first publish.
export const setVivaStatus = (id: number, status: VivaStatus, publishedAt: string | null) =>
  run('UPDATE vivas SET status = $1, published_at = COALESCE(published_at, $2) WHERE id = $3', [status, publishedAt, id]);

export const deleteViva = (id: number) => run('DELETE FROM vivas WHERE id = $1', [id]);

export const questionRows = (vivaId: number) =>
  query<QuestionRow>('SELECT id, data FROM viva_questions WHERE viva_id = $1 ORDER BY position, id', [vivaId]);

// Replaces the whole list. A question keeps its id when the teacher sends that id back, so attempt answers still match.
// New questions take their ids from the sequence, so they never collide with the kept ones.
export async function replaceQuestions(vivaId: number, questions: (DraftQuestion & { id?: number })[]) {
  const existing = new Set((await questionRows(vivaId)).map((r) => r.id));
  await run('DELETE FROM viva_questions WHERE viva_id = $1', [vivaId]);
  const kept = new Set<number>();
  for (const [position, q] of questions.entries()) {
    const { id, ...rest } = q;
    const keep = id !== undefined && existing.has(id) && !kept.has(id) ? id : null;
    if (keep !== null) kept.add(keep);
    await run('INSERT INTO viva_questions (id, viva_id, position, data) VALUES ($1, $2, $3, $4)', [
      keep,
      vivaId,
      position,
      JSON.stringify(rest),
    ]);
  }
}

export const attemptFor = (vivaId: number, userId: string) =>
  one<AttemptRow>('SELECT * FROM viva_attempts WHERE viva_id = $1 AND user_id = $2', [vivaId, userId]);

export const attemptById = (id: number) => one<AttemptRow>('SELECT * FROM viva_attempts WHERE id = $1', [id]);

export const attemptsForViva = (vivaId: number) =>
  query<AttemptRow>(
    `SELECT a.*, u.name AS student_name, u.email AS student_email
     FROM viva_attempts a JOIN users u ON u.id = a.user_id
     WHERE a.viva_id = $1 ORDER BY a.started_at DESC, a.id DESC`,
    [vivaId],
  );

export const insertAttempt = (vivaId: number, userId: string, startedAt: string) =>
  run(
    `INSERT INTO viva_attempts (viva_id, user_id, status, started_at, pending_review)
     VALUES ($1, $2, 'in_progress', $3, 0) ON CONFLICT (viva_id, user_id) DO NOTHING`,
    [vivaId, userId, startedAt],
  );

export const setTranscript = (attemptId: number, transcript: string) =>
  run('UPDATE viva_attempts SET transcript = $1 WHERE id = $2', [transcript, attemptId]);

export const finishAttempt = (id: number, submittedAt: string, score: number, pending: boolean) =>
  run(`UPDATE viva_attempts SET status = 'submitted', submitted_at = $1, score = $2, pending_review = $3 WHERE id = $4`, [
    submittedAt,
    score,
    pending ? 1 : 0,
    id,
  ]);

export const setAttemptScore = (id: number, score: number, pending: boolean) =>
  run('UPDATE viva_attempts SET score = $1, pending_review = $2 WHERE id = $3', [score, pending ? 1 : 0, id]);

export const answerRows = (attemptId: number) =>
  query<AnswerRow>('SELECT * FROM viva_answers WHERE attempt_id = $1', [attemptId]);

// While in progress. Grades are not touched.
export const upsertAnswer = (attemptId: number, questionId: number, answer: string) =>
  run(
    `INSERT INTO viva_answers (attempt_id, question_id, answer) VALUES ($1, $2, $3)
     ON CONFLICT (attempt_id, question_id) DO UPDATE SET answer = EXCLUDED.answer`,
    [attemptId, questionId, answer],
  );

// Submit: stores the answer with its grade.
export const writeGrade = (
  attemptId: number,
  questionId: number,
  answer: string | null,
  correct: boolean | null,
  score: number | null,
) =>
  run(
    `INSERT INTO viva_answers (attempt_id, question_id, answer, correct, score) VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (attempt_id, question_id) DO UPDATE SET
       answer = EXCLUDED.answer, correct = EXCLUDED.correct, score = EXCLUDED.score`,
    [attemptId, questionId, answer, correct === null ? null : correct ? 1 : 0, score],
  );

// Teacher grade: only the score moves.
export const setAnswerScore = (attemptId: number, questionId: number, score: number) =>
  run(
    `INSERT INTO viva_answers (attempt_id, question_id, score) VALUES ($1, $2, $3)
     ON CONFLICT (attempt_id, question_id) DO UPDATE SET score = EXCLUDED.score`,
    [attemptId, questionId, score],
  );
