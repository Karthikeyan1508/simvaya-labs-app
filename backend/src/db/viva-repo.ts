import { one, query, run, inTransaction } from './db';
import type { DraftQuestion, VivaStatus } from '../viva/types';

export { inTransaction };

// The Neon column is still vivas.teacher_id (kept on purpose). Code calls it owner: the student who made the self-assessment.
const VIVA_COLS = 'id, teacher_id AS owner_id, title, experiment_id, status, created_at, published_at';

export interface VivaRow {
  id: number;
  owner_id: string;
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
}

export interface AnswerRow {
  attempt_id: number;
  question_id: number;
  answer: string | null;
  correct: number | null;
  score: number | null;
  feedback: string | null;
}

// One row per viva with its counts. Used by the student list.
const SUMMARY_SQL = `SELECT ${VIVA_COLS},
    (SELECT COUNT(*)::int FROM viva_questions q WHERE q.viva_id = v.id) AS question_count,
    (SELECT COUNT(*)::int FROM viva_attempts a WHERE a.viva_id = v.id) AS attempt_count,
    (SELECT COUNT(*)::int FROM viva_attempts a WHERE a.viva_id = v.id AND a.status = 'submitted') AS submitted_count
  FROM vivas v`;

export const vivaRow = (id: number) => one<VivaRow>(`SELECT ${VIVA_COLS} FROM vivas WHERE id = $1`, [id]);

export const vivaSummary = (id: number) => one<VivaSummaryRow>(`${SUMMARY_SQL} WHERE v.id = $1`, [id]);

export const vivasOwnedBy = (ownerId: string) =>
  query<VivaSummaryRow>(`${SUMMARY_SQL} WHERE v.teacher_id = $1 ORDER BY v.id DESC`, [ownerId]);

export async function insertViva(
  ownerId: string,
  title: string,
  experimentId: string,
  status: VivaStatus,
  publishedAt: string | null,
  createdAt: string,
): Promise<number> {
  const [row] = await query<{ id: number }>(
    'INSERT INTO vivas (teacher_id, title, experiment_id, status, created_at, published_at) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
    [ownerId, title, experimentId, status, createdAt, publishedAt],
  );
  return row.id;
}

export const questionRows = (vivaId: number) =>
  query<QuestionRow>('SELECT id, data FROM viva_questions WHERE viva_id = $1 ORDER BY position, id', [vivaId]);

export async function insertQuestions(vivaId: number, questions: DraftQuestion[]) {
  for (const [position, q] of questions.entries()) {
    await run('INSERT INTO viva_questions (viva_id, position, data) VALUES ($1, $2, $3)', [
      vivaId,
      position,
      JSON.stringify(q),
    ]);
  }
}

export const attemptFor = (vivaId: number, userId: string) =>
  one<AttemptRow>('SELECT * FROM viva_attempts WHERE viva_id = $1 AND user_id = $2', [vivaId, userId]);

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

export const answerRows = (attemptId: number) =>
  query<AnswerRow>('SELECT * FROM viva_answers WHERE attempt_id = $1', [attemptId]);

// While in progress. Grades are not touched.
export const upsertAnswer = (attemptId: number, questionId: number, answer: string) =>
  run(
    `INSERT INTO viva_answers (attempt_id, question_id, answer) VALUES ($1, $2, $3)
     ON CONFLICT (attempt_id, question_id) DO UPDATE SET answer = EXCLUDED.answer`,
    [attemptId, questionId, answer],
  );

// Submit: stores the answer with its grade and the marker's feedback.
export const writeGrade = (
  attemptId: number,
  questionId: number,
  answer: string | null,
  correct: boolean | null,
  score: number | null,
  feedback: string | null,
) =>
  run(
    `INSERT INTO viva_answers (attempt_id, question_id, answer, correct, score, feedback) VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (attempt_id, question_id) DO UPDATE SET
       answer = EXCLUDED.answer, correct = EXCLUDED.correct, score = EXCLUDED.score, feedback = EXCLUDED.feedback`,
    [attemptId, questionId, answer, correct === null ? null : correct ? 1 : 0, score, feedback],
  );

// Children (questions, attempts, answers) are removed by ON DELETE CASCADE.
export const deleteViva = (id: number, ownerId: string) =>
  run('DELETE FROM vivas WHERE id = $1 AND teacher_id = $2', [id, ownerId]);
