import { TIMER_CRITICAL_SEC, TIMER_WARN_SEC } from '../../lib/config';
import { formatTime } from './useTimer';

export function TimerPill({ remainingSec }: { remainingSec: number }) {
  const tone =
    remainingSec <= TIMER_CRITICAL_SEC
      ? 'bg-red-100 text-red-800 timer-critical'
      : remainingSec <= TIMER_WARN_SEC
        ? 'bg-amber-100 text-amber-800'
        : 'bg-slate-100 text-slate-700';

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-mono text-sm font-semibold tabular-nums ${tone}`}
      title="Time remaining — the timer cannot be paused"
    >
      <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4" aria-hidden="true">
        <path
          fillRule="evenodd"
          d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm.75-13a.75.75 0 0 0-1.5 0v5c0 .27.14.52.37.65l3.5 2a.75.75 0 1 0 .76-1.3L10.75 9.6V5Z"
          clipRule="evenodd"
        />
      </svg>
      {formatTime(remainingSec)}
    </span>
  );
}
