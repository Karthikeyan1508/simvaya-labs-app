import { db } from './db';
import type { DraftQuestion, VivaStatus } from '../viva/types';

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
    (SELECT COUNT(*) FROM viva_questions q WHERE q.viva_id = v.id) AS question_count,
    (SELECT COUNT(*) FROM viva_attempts a WHERE a.viva_id = v.id) AS attempt_count,
    (SELECT COUNT(*) FROM viva_attempts a WHERE a.viva_id = v.id AND a.status = 'submitted') AS submitted_count
  FROM vivas v`;

// Multi-row writes run inside this. The functions below never open a transaction themselves.
export function inTransaction<T>(fn: () => T): T {
  db.exec('BEGIN');
  try {
    const out = fn();
    db.exec('COMMIT');
    return out;
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}

export const vivaRow = (id: number) =>
  db.prepare('SELECT * FROM vivas WHERE id = ?').get(id) as VivaRow | undefined;

export const vivaSummary = (id: number) =>
  db.prepare(`${SUMMARY_SQL} WHERE v.id = ?`).get(id) as VivaSummaryRow | undefined;

export const vivasByTeacher = (teacherId: string) =>
  db.prepare(`${SUMMARY_SQL} WHERE v.teacher_id = ? ORDER BY v.id DESC`).all(teacherId) as unknown as VivaSummaryRow[];

export const vivasPublished = () =>
  db
    .prepare(`${SUMMARY_SQL} WHERE v.status = 'published' ORDER BY v.published_at DESC, v.id DESC`)
    .all() as unknown as VivaSummaryRow[];

export function insertViva(
  teacherId: string,
  title: string,
  experimentId: string,
  status: VivaStatus,
  publishedAt: string | null,
  createdAt: string,
): number {
  const res = db
    .prepare('INSERT INTO vivas (teacher_id, title, experiment_id, status, created_at, published_at) VALUES (?, ?, ?, ?, ?, ?)')
    .run(teacherId, title, experimentId, status, createdAt, publishedAt);
  return Number(res.lastInsertRowid);
}

export const updateTitle = (id: number, title: string) =>
  db.prepare('UPDATE vivas SET title = ? WHERE id = ?').run(title, id);

// published_at is kept from the first publish.
export const setVivaStatus = (id: number, status: VivaStatus, publishedAt: string | null) =>
  db
    .prepare('UPDATE vivas SET status = ?, published_at = COALESCE(published_at, ?) WHERE id = ?')
    .run(status, publishedAt, id);

export const deleteViva = (id: number) => db.prepare('DELETE FROM vivas WHERE id = ?').run(id);

export const questionRows = (vivaId: number) =>
  db
    .prepare('SELECT id, data FROM viva_questions WHERE viva_id = ? ORDER BY position, id')
    .all(vivaId) as unknown as QuestionRow[];

// Replaces the whole list. A question keeps its id when the teacher sends that id back, so attempt answers still match.
export function replaceQuestions(vivaId: number, questions: (DraftQuestion & { id?: number })[]) {
  const existing = new Set(questionRows(vivaId).map((r) => r.id));
  db.prepare('DELETE FROM viva_questions WHERE viva_id = ?').run(vivaId);
  const insert = db.prepare('INSERT INTO viva_questions (id, viva_id, position, data) VALUES (?, ?, ?, ?)');
  const kept = new Set<number>();
  questions.forEach((q, position) => {
    const { id, ...rest } = q;
    const keep = id !== undefined && existing.has(id) && !kept.has(id) ? id : null;
    if (keep !== null) kept.add(keep);
    insert.run(keep, vivaId, position, JSON.stringify(rest));
  });
}

export const attemptFor = (vivaId: number, userId: string) =>
  db.prepare('SELECT * FROM viva_attempts WHERE viva_id = ? AND user_id = ?').get(vivaId, userId) as
    | AttemptRow
    | undefined;

export const attemptById = (id: number) =>
  db.prepare('SELECT * FROM viva_attempts WHERE id = ?').get(id) as AttemptRow | undefined;

export const attemptsForViva = (vivaId: number) =>
  db
    .prepare(
      `SELECT a.*, u.name AS student_name, u.email AS student_email
       FROM viva_attempts a JOIN users u ON u.id = a.user_id
       WHERE a.viva_id = ? ORDER BY a.started_at DESC, a.id DESC`,
    )
    .all(vivaId) as unknown as AttemptRow[];

export const insertAttempt = (vivaId: number, userId: string, startedAt: string) =>
  db
    .prepare(`INSERT OR IGNORE INTO viva_attempts (viva_id, user_id, status, started_at, pending_review) VALUES (?, ?, 'in_progress', ?, 0)`)
    .run(vivaId, userId, startedAt);

export const finishAttempt = (id: number, submittedAt: string, score: number, pending: boolean) =>
  db
    .prepare(`UPDATE viva_attempts SET status = 'submitted', submitted_at = ?, score = ?, pending_review = ? WHERE id = ?`)
    .run(submittedAt, score, pending ? 1 : 0, id);

export const setAttemptScore = (id: number, score: number, pending: boolean) =>
  db
    .prepare('UPDATE viva_attempts SET score = ?, pending_review = ? WHERE id = ?')
    .run(score, pending ? 1 : 0, id);

export const answerRows = (attemptId: number) =>
  db.prepare('SELECT * FROM viva_answers WHERE attempt_id = ?').all(attemptId) as unknown as AnswerRow[];

// While in progress. Grades are not touched.
export const upsertAnswer = (attemptId: number, questionId: number, answer: string) =>
  db
    .prepare(
      `INSERT INTO viva_answers (attempt_id, question_id, answer) VALUES (?, ?, ?)
       ON CONFLICT (attempt_id, question_id) DO UPDATE SET answer = excluded.answer`,
    )
    .run(attemptId, questionId, answer);

// Submit: stores the answer with its grade.
export const writeGrade = (
  attemptId: number,
  questionId: number,
  answer: string | null,
  correct: boolean | null,
  score: number | null,
) =>
  db
    .prepare(
      `INSERT INTO viva_answers (attempt_id, question_id, answer, correct, score) VALUES (?, ?, ?, ?, ?)
       ON CONFLICT (attempt_id, question_id) DO UPDATE SET
         answer = excluded.answer, correct = excluded.correct, score = excluded.score`,
    )
    .run(attemptId, questionId, answer, correct === null ? null : correct ? 1 : 0, score);

// Teacher grade: only the score moves.
export const setAnswerScore = (attemptId: number, questionId: number, score: number) =>
  db
    .prepare(
      `INSERT INTO viva_answers (attempt_id, question_id, score) VALUES (?, ?, ?)
       ON CONFLICT (attempt_id, question_id) DO UPDATE SET score = excluded.score`,
    )
    .run(attemptId, questionId, score);
