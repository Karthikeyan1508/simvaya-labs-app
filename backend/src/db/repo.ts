import { randomBytes } from 'node:crypto';
import { db } from './db';

export type UserRole = 'student' | 'teacher';

export interface UserRow {
  id: string;
  email: string;
  password_hash: string;
  name: string;
  roll_no: string;
  college: string;
  branch: string;
  semester: number;
  created_at: string;
  role: UserRole;
}

export interface RecordingRow {
  id: number;
  experiment_id: string;
  data: string;
  created_at: string;
}

export interface ActivityRow {
  id: number;
  type: string;
  experiment_id: string | null;
  created_at: string;
}

const SESSION_DAYS = 30;
const now = () => new Date().toISOString();

export const userByEmail = (email: string) =>
  db.prepare('SELECT * FROM users WHERE email = ?').get(email) as UserRow | undefined;

export const userById = (id: string) =>
  db.prepare('SELECT * FROM users WHERE id = ?').get(id) as UserRow | undefined;

export function updateProfile(id: string, p: { name?: string; rollNo?: string; college?: string }) {
  db.prepare(
    `UPDATE users SET
       name = COALESCE(?, name),
       roll_no = COALESCE(?, roll_no),
       college = COALESCE(?, college)
     WHERE id = ?`,
  ).run(p.name ?? null, p.rollNo ?? null, p.college ?? null, id);
}

export function setPasswordHash(id: string, hash: string) {
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hash, id);
}

export function createSession(userId: string): string {
  const token = randomBytes(32).toString('hex');
  const expires = new Date(Date.now() + SESSION_DAYS * 86_400_000).toISOString();
  db.prepare('INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)').run(token, userId, expires);
  return token;
}

export function userForSession(token: string) {
  return db
    .prepare(
      `SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id
       WHERE s.token = ? AND s.expires_at > ?`,
    )
    .get(token, now()) as UserRow | undefined;
}

export const deleteSession = (token: string) => db.prepare('DELETE FROM sessions WHERE token = ?').run(token);

export function insertRecording(userId: string, experimentId: string, data: Record<string, unknown>) {
  const created = now();
  const res = db
    .prepare('INSERT INTO recordings (user_id, experiment_id, data, created_at) VALUES (?, ?, ?, ?)')
    .run(userId, experimentId, JSON.stringify(data), created);
  return { id: Number(res.lastInsertRowid), experimentId, data, createdAt: created };
}

export const listRecordings = (userId: string, experimentId?: string) =>
  (experimentId
    ? db
        .prepare('SELECT id, experiment_id, data, created_at FROM recordings WHERE user_id = ? AND experiment_id = ? ORDER BY id DESC')
        .all(userId, experimentId)
    : db
        .prepare('SELECT id, experiment_id, data, created_at FROM recordings WHERE user_id = ? ORDER BY id DESC')
        .all(userId)) as unknown as (RecordingRow)[];

export function insertActivity(userId: string, type: string, experimentId: string | null) {
  db.prepare('INSERT INTO activities (user_id, type, experiment_id, created_at) VALUES (?, ?, ?, ?)').run(
    userId,
    type,
    experimentId,
    now(),
  );
}

export const listActivities = (userId: string, limit: number) =>
  db
    .prepare('SELECT id, type, experiment_id, created_at FROM activities WHERE user_id = ? ORDER BY id DESC LIMIT ?')
    .all(userId, limit) as unknown as ActivityRow[];

// Attempts = times the pump was started in an experiment visit.
export const attemptsByExperiment = (userId: string) =>
  db
    .prepare(
      `SELECT experiment_id, COUNT(*) AS n FROM activities
       WHERE user_id = ? AND type = 'attempt_started' GROUP BY experiment_id`,
    )
    .all(userId) as unknown as { experiment_id: string; n: number }[];

export const countRecordings = (userId: string) =>
  (db.prepare('SELECT COUNT(*) AS n FROM recordings WHERE user_id = ?').get(userId) as { n: number }).n;

export const activitiesSince = (userId: string, sinceIso: string) =>
  (
    db
      .prepare('SELECT COUNT(*) AS n FROM activities WHERE user_id = ? AND created_at >= ?')
      .get(userId, sinceIso) as { n: number }
  ).n;

export const lastActivityAt = (userId: string) =>
  (
    db.prepare('SELECT MAX(created_at) AS t FROM activities WHERE user_id = ?').get(userId) as { t: string | null }
  ).t;

