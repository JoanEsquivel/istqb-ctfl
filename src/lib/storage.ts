import type { Attempt, QuizState, Settings } from './types';

const ATTEMPTS_KEY = 'istqb.attempts.v1';
const IN_PROGRESS_PREFIX = 'istqb.inprogress.v1:';
const SETTINGS_KEY = 'istqb.settings.v1';
const MAX_ATTEMPTS = 100;

function read<T>(key: string): T | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function write(key: string, value: unknown): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage full or unavailable — the quiz keeps working without persistence.
  }
}

export function loadAttempts(): Attempt[] {
  const attempts = read<Attempt[]>(ATTEMPTS_KEY);
  return Array.isArray(attempts) ? attempts : [];
}

export function getAttempt(id: string): Attempt | undefined {
  return loadAttempts().find((a) => a.id === id);
}

export function saveAttempt(attempt: Attempt): void {
  const attempts = [attempt, ...loadAttempts()].slice(0, MAX_ATTEMPTS);
  write(ATTEMPTS_KEY, attempts);
}

export function attemptsForExam(examId: string): Attempt[] {
  return loadAttempts().filter((a) => a.examId === examId);
}

export function loadInProgress(examId: string): QuizState | null {
  return read<QuizState>(IN_PROGRESS_PREFIX + examId);
}

export function saveInProgress(state: QuizState): void {
  write(IN_PROGRESS_PREFIX + state.examId, state);
}

export function clearInProgress(examId: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(IN_PROGRESS_PREFIX + examId);
  } catch {
    // ignore
  }
}

export function loadSettings(): Settings {
  return read<Settings>(SETTINGS_KEY) ?? { extendedTime: false };
}

export function saveSettings(settings: Settings): void {
  write(SETTINGS_KEY, settings);
}
