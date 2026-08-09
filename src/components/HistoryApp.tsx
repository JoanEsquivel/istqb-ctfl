import { useEffect, useState } from 'react';
import type { Attempt } from '../lib/types';
import { EXAM_SETS } from '../lib/exams';
import { loadAttempts } from '../lib/storage';
import { Badge } from './ui/Badge';
import { Card } from './ui/Card';

const labelById = new Map(EXAM_SETS.map((set) => [set.id, set.label]));

function formatDate(ts: number): string {
  return new Date(ts).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export default function HistoryApp() {
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setAttempts(loadAttempts());
    setLoaded(true);
  }, []);

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-6 text-2xl font-bold text-slate-900">Attempt history</h1>

      {loaded && attempts.length === 0 && (
        <Card className="p-10 text-center">
          <p className="text-slate-500">No attempts yet.</p>
          <a href="/" className="mt-2 inline-block text-sm font-medium text-indigo-600 hover:underline">
            Pick an exam to get started →
          </a>
        </Card>
      )}

      <div className="flex flex-col gap-3">
        {attempts.map((attempt) => (
          <a key={attempt.id} href={`/review/?attempt=${attempt.id}`} className="group">
            <Card className="flex flex-wrap items-center gap-x-4 gap-y-2 p-4 transition-all group-hover:border-indigo-400 group-hover:shadow-md">
              <div className="min-w-40">
                <p className="font-semibold text-slate-900 group-hover:text-indigo-700">
                  {labelById.get(attempt.examId) ?? attempt.examId}
                </p>
                <p className="text-xs text-slate-400">{formatDate(attempt.submittedAt)}</p>
              </div>
              <Badge tone={attempt.mode === 'exam' ? 'indigo' : 'neutral'}>
                {attempt.mode === 'exam' ? '⏱ Exam' : '📚 Practice'}
              </Badge>
              {attempt.submitReason === 'timeout' && <Badge tone="amber">Time expired</Badge>}
              <div className="ml-auto flex items-center gap-3">
                <span className="font-mono text-sm font-semibold text-slate-700 tabular-nums">
                  {attempt.score}/{attempt.maxScore}
                </span>
                <Badge tone={attempt.passed ? 'green' : 'red'}>
                  {attempt.passed ? 'Passed' : 'Not passed'}
                </Badge>
                <span className="text-sm font-medium text-indigo-600">Review →</span>
              </div>
            </Card>
          </a>
        ))}
      </div>
    </div>
  );
}
