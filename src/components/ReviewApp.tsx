import { useEffect, useState } from 'react';
import type { Attempt } from '../lib/types';
import { EXAM_SETS } from '../lib/exams';
import { getAttempt } from '../lib/storage';
import { Card } from './ui/Card';
import { ResultsScreen } from './results/ResultsScreen';

export default function ReviewApp() {
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get('attempt');
    if (id) setAttempt(getAttempt(id) ?? null);
    setLoaded(true);
  }, []);

  if (!loaded) return null;

  const exam = attempt ? EXAM_SETS.find((set) => set.id === attempt.examId) : undefined;

  if (!attempt || !exam) {
    return (
      <Card className="mx-auto max-w-md p-10 text-center">
        <p className="text-slate-500">Attempt not found.</p>
        <a href="/history/" className="mt-2 inline-block text-sm font-medium text-indigo-600 hover:underline">
          Back to history →
        </a>
      </Card>
    );
  }

  return (
    <div>
      <p className="mb-4 text-sm text-slate-500">
        <a href="/history/" className="font-medium text-indigo-600 hover:underline">
          ← History
        </a>{' '}
        · Attempt from {new Date(attempt.submittedAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
      </p>
      <ResultsScreen
        exam={exam}
        answers={attempt.answers}
        flagged={attempt.flagged}
        mode={attempt.mode}
        submitReason={attempt.submitReason}
      />
    </div>
  );
}
