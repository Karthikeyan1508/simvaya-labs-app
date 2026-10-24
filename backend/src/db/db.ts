import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { hashPassword } from '../auth/password';

// One SQLite file, created on first run. DB_FILE overrides the location.
const file = process.env.DB_FILE ?? path.resolve(__dirname, '..', '..', 'data', 'simvaya.db');
fs.mkdirSync(path.dirname(file), { recursive: true });

export const db = new DatabaseSync(file);
db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  roll_no TEXT NOT NULL DEFAULT '',
  college TEXT NOT NULL DEFAULT '',
  branch TEXT NOT NULL DEFAULT 'Mechanical Engineering',
  semester INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS recordings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  experiment_id TEXT NOT NULL,
  data TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS activities (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  experiment_id TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_recordings_user ON recordings(user_id, experiment_id);
CREATE INDEX IF NOT EXISTS idx_activities_user ON activities(user_id, created_at);
CREATE TABLE IF NOT EXISTS vivas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  teacher_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  experiment_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('draft', 'published', 'closed')),
  created_at TEXT NOT NULL,
  published_at TEXT
);
CREATE TABLE IF NOT EXISTS viva_questions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  viva_id INTEGER NOT NULL REFERENCES vivas(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  data TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS viva_attempts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  viva_id INTEGER NOT NULL REFERENCES vivas(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('in_progress', 'submitted')),
  started_at TEXT NOT NULL,
  submitted_at TEXT,
  score REAL,
  pending_review INTEGER NOT NULL DEFAULT 0,
  UNIQUE (viva_id, user_id)
);
CREATE TABLE IF NOT EXISTS viva_answers (
  attempt_id INTEGER NOT NULL REFERENCES viva_attempts(id) ON DELETE CASCADE,
  question_id INTEGER NOT NULL,
  answer TEXT,
  correct INTEGER,
  score REAL,
  PRIMARY KEY (attempt_id, question_id)
);
CREATE INDEX IF NOT EXISTS idx_vivas_teacher ON vivas(teacher_id);
CREATE INDEX IF NOT EXISTS idx_viva_questions_viva ON viva_questions(viva_id, position);
`);

// Databases made before roles existed get the column once. Existing rows become students.
const userColumns = db.prepare('PRAGMA table_info(users)').all() as unknown as { name: string }[];
if (!userColumns.some((c) => c.name === 'role')) {
  db.exec(`ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'teacher'))`);
}

// Demo account so the app can be used straight away. Not for production.
const { n } = db.prepare('SELECT COUNT(*) AS n FROM users').get() as { n: number };
if (n === 0) {
  db.prepare(
    `INSERT INTO users (id, email, password_hash, name, roll_no, college, branch, semester, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    randomUUID(),
    'student@simvaya.lab',
    hashPassword('simvaya-demo'),
    'Arjun Kumar',
    'MECH-2023-041',
    'Demo Institute of Technology',
    'Mechanical Engineering',
    6,
    new Date().toISOString(),
  );
}

// Teacher account for the viva module. Added only when no teacher exists, and never over an existing user.
const teacherEmail = (process.env.TEACHER_EMAIL ?? 'teacher@simvaya.lab').toLowerCase();
const hasTeacher = db.prepare(`SELECT 1 FROM users WHERE role = 'teacher' LIMIT 1`).get();
if (!hasTeacher) {
  if (db.prepare('SELECT 1 FROM users WHERE email = ?').get(teacherEmail)) {
    console.warn(`TEACHER_EMAIL ${teacherEmail} already belongs to a user, so no teacher was seeded.`);
  } else {
    db.prepare(
      `INSERT INTO users (id, email, password_hash, name, roll_no, college, branch, semester, created_at, role)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'teacher')`,
    ).run(
      randomUUID(),
      teacherEmail,
      hashPassword(process.env.TEACHER_PASSWORD ?? 'simvaya-teacher'),
      'Lab Teacher',
      '',
      'Demo Institute of Technology',
      'Mechanical Engineering',
      1,
      new Date().toISOString(),
    );
  }
}
