export const STANDARD_DURATION_SEC = 3600;
export const EXTENDED_TIME_FACTOR = 1.25;
// Per-question pacing used to derive a duration for the unofficial bonus set,
// matching the official rate (3600 s / 40 questions).
export const SECONDS_PER_QUESTION = 90;
export const PASS_RATIO = 0.65;

export const TIMER_WARN_SEC = 10 * 60;
export const TIMER_CRITICAL_SEC = 5 * 60;

export function examDuration(baseSec: number, extendedTime: boolean): number {
  return Math.round(baseSec * (extendedTime ? EXTENDED_TIME_FACTOR : 1));
}
