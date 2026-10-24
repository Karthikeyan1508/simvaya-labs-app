import { randomBytes, randomUUID } from 'node:crypto';
import { one, query, run } from './db';

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

export const userByEmail = (email: string) => one<UserRow>('SELECT * FROM users WHERE email = $1', [email]);

export const userById = (id: string) => one<UserRow>('SELECT * FROM users WHERE id = $1', [id]);

export async function updateProfile(id: string, p: { name?: string; rollNo?: string; college?: string }) {
  await run(
    `UPDATE users SET
       name = COALESCE($1, name),
       roll_no = COALESCE($2, roll_no),
       college = COALESCE($3, college)
     WHERE id = $4`,
    [p.name ?? null, p.rollNo ?? null, p.college ?? null, id],
  );
}

export async function setPasswordHash(id: string, hash: string) {
  await run('UPDATE users SET password_hash = $1 WHERE id = $2', [hash, id]);
}

export async function createSession(userId: string): Promise<string> {
  const token = randomBytes(32).toString('hex');
  const expires = new Date(Date.now() + SESSION_DAYS * 86_400_000).toISOString();
  await run('INSERT INTO sessions (token, user_id, expires_at) VALUES ($1, $2, $3)', [token, userId, expires]);
  return token;
}

export const userForSession = (token: string) =>
  one<UserRow>(
    `SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id
     WHERE s.token = $1 AND s.expires_at > $2`,
    [token, now()],
  );

export const deleteSession = (token: string) => run('DELETE FROM sessions WHERE token = $1', [token]);

export async function insertRecording(userId: string, experimentId: string, data: Record<string, unknown>) {
  const created = now();
  const [row] = await query<{ id: number }>(
    'INSERT INTO recordings (user_id, experiment_id, data, created_at) VALUES ($1, $2, $3, $4) RETURNING id',
    [userId, experimentId, JSON.stringify(data), created],
  );
  return { id: row.id, experimentId, data, createdAt: created };
}

export const listRecordings = (userId: string, experimentId?: string) =>
  experimentId
    ? query<RecordingRow>(
        'SELECT id, experiment_id, data, created_at FROM recordings WHERE user_id = $1 AND experiment_id = $2 ORDER BY id DESC',
        [userId, experimentId],
      )
    : query<RecordingRow>(
        'SELECT id, experiment_id, data, created_at FROM recordings WHERE user_id = $1 ORDER BY id DESC',
        [userId],
      );

export async function insertActivity(userId: string, type: string, experimentId: string | null) {
  await run('INSERT INTO activities (user_id, type, experiment_id, created_at) VALUES ($1, $2, $3, $4)', [
    userId,
    type,
    experimentId,
    now(),
  ]);
}

export const listActivities = (userId: string, limit: number) =>
  query<ActivityRow>(
    'SELECT id, type, experiment_id, created_at FROM activities WHERE user_id = $1 ORDER BY id DESC LIMIT $2',
    [userId, limit],
  );

// Attempts = times the pump was started in an experiment visit.
export const attemptsByExperiment = (userId: string) =>
  query<{ experiment_id: string; n: number }>(
    `SELECT experiment_id, COUNT(*)::int AS n FROM activities
     WHERE user_id = $1 AND type = 'attempt_started' GROUP BY experiment_id`,
    [userId],
  );

export const countRecordings = async (userId: string) =>
  (await one<{ n: number }>('SELECT COUNT(*)::int AS n FROM recordings WHERE user_id = $1', [userId]))?.n ?? 0;

export const activitiesSince = async (userId: string, sinceIso: string) =>
  (await one<{ n: number }>('SELECT COUNT(*)::int AS n FROM activities WHERE user_id = $1 AND created_at >= $2', [userId, sinceIso]))?.n ?? 0;

export const lastActivityAt = async (userId: string) =>
  (await one<{ t: string | null }>('SELECT MAX(created_at) AS t FROM activities WHERE user_id = $1', [userId]))?.t ?? null;

// Accounts made by Google sign-in have no password: an empty hash never verifies.
export async function createGoogleUser(email: string, name: string): Promise<UserRow> {
  const id = randomUUID();
  await run(
    `INSERT INTO users (id, email, password_hash, name, roll_no, college, branch, semester, created_at)
     VALUES ($1, $2, '', $3, '', '', 'Mechanical Engineering', 1, $4)`,
    [id, email, name, now()],
  );
  return (await userById(id))!;
}
