import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import type { ObservationRow as InductionObservationRow } from '@/lib/induction';
import type { ObservationRow } from '@/lib/types';
import { firebaseAuth } from '@/lib/firebase';

// Account, academics and records. Everything here except login talks to the backend with the session token.

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
const TOKEN_KEY = 'simvaya.token';

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

// The token lives in localStorage for this browser only. Use httpOnly cookies before going to production.
export const getToken = () => {
  try {
    return window.localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
};
export const saveToken = (token: string) => {
  try {
    window.localStorage.setItem(TOKEN_KEY, token);
  } catch {
    /* storage blocked: the session lasts until reload */
  }
};
export const clearToken = () => {
  try {
    window.localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* nothing to clear */
  }
};

export async function call<T>(path: string, init: RequestInit = {}, auth = true): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body !== undefined) headers.set('Content-Type', 'application/json');
  if (auth) {
    const token = getToken();
    if (token) headers.set('Authorization', `Bearer ${token}`);
  }
  const res = await fetch(`${BASE}${path}`, { ...init, headers });
  const body = (await res.json().catch(() => null)) as { message?: string | string[] } | null;
  if (!res.ok) {
    const message = Array.isArray(body?.message) ? body.message.join(', ') : body?.message;
    throw new ApiError(res.status, message ?? `Request failed (${res.status})`);
  }
  return body as T;
}

const post = <T>(path: string, data?: unknown, auth = true) =>
  call<T>(path, { method: 'POST', body: data === undefined ? undefined : JSON.stringify(data) }, auth);

export interface User {
  id: string;
  email: string;
  name: string;
  rollNo: string;
  college: string;
  branch: string;
  semester: number;
  role: 'student' | 'teacher';
  createdAt: string;
}

export interface ExperimentEntry {
  id: string;
  no: number;
  title: string;
  available: boolean;
  performed: boolean;
}

export interface SubjectOverview {
  id: string;
  name: string;
  lab: boolean;
  experiments: ExperimentEntry[];
  performed: number;
  availableExperiments: number;
}

export interface SemesterOverview {
  number: number;
  status: 'completed' | 'active' | 'upcoming';
  subjects: SubjectOverview[];
}

export interface Academics {
  branch: string;
  activeSemester: number;
  semesters: SemesterOverview[];
}

export interface Summary {
  attempts: { total: number; byExperiment: { experimentId: string; count: number }[] };
  recordings: number;
  activitiesThisWeek: number;
  lastActiveAt: string | null;
  vivaScore: number | null;
}

export interface RecordingItem {
  id: number;
  experimentId: string;
  data: ObservationRow;
  createdAt: string;
}

export type ActivityType = 'signed_in' | 'experiment_opened' | 'attempt_started' | 'row_recorded' | 'sweep_run';

export interface ActivityItem {
  id: number;
  type: ActivityType;
  experimentId: string | null;
  createdAt: string;
}

export const login = (email: string, password: string) =>
  post<{ token: string; user: User }>('/auth/login', { email, password }, false);

// Google sign-in runs in Firebase. The backend checks the ID token and returns the same session token as password login.
export const googleSignIn = async () => {
  const cred = await signInWithPopup(firebaseAuth(), new GoogleAuthProvider());
  const idToken = await cred.user.getIdToken();
  return post<{ token: string; user: User }>('/auth/firebase', { idToken }, false);
};
export const logout = () => post<{ ok: true }>('/auth/logout');
export const fetchMe = () => call<User>('/auth/me');

export const updateProfile = (p: { name: string; rollNo: string; college: string }) =>
  call<User>('/me', { method: 'PATCH', body: JSON.stringify(p) });
export const changePassword = (current: string, next: string) => post<{ ok: true }>('/me/password', { current, next });
export const fetchSummary = () => call<Summary>('/me/summary');
export const fetchAcademics = () => call<Academics>('/academics');

export const fetchRecordings = (experimentId?: string) =>
  call<RecordingItem[]>(`/me/recordings${experimentId ? `?experimentId=${encodeURIComponent(experimentId)}` : ''}`);
export const saveRecording = (experimentId: string, data: ObservationRow | InductionObservationRow) =>
  post<RecordingItem>('/me/recordings', { experimentId, data });

export const fetchActivities = (limit = 100) => call<ActivityItem[]>(`/me/activities?limit=${limit}`);
export const logActivity = (type: Exclude<ActivityType, 'signed_in' | 'row_recorded'>, experimentId?: string) =>
  post<{ ok: true }>('/me/activities', { type, experimentId });

// Titles for experiments that have a lab page.
export const EXPERIMENT_TITLES: Record<string, string> = {
  'pelton-wheel': 'Performance characteristics of a Pelton turbine',
  'sorting-visualiser': 'Sorting algorithm visualiser',
};
