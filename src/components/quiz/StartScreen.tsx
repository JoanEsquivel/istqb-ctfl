import { useEffect, useState } from 'react';
import type { Attempt, ExamSet, QuizMode, QuizState } from '../../lib/types';
import { examDuration } from '../../lib/config';
import { attemptsForExam, loadSettings, saveSettings } from '../../lib/storage';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';

interface Props {
  exam: ExamSet;
  resume: QuizState | null;
  onResume: () => void;
  onDiscard: () => void;
  onStart: (mode: QuizMode, extendedTime: boolean) => void;
}

const MODE_CARDS: Array<{
  mode: QuizMode;
  icon: string;
  title: string;
  description: string;
}> = [
  {
    mode: 'exam',
    icon: '⏱',
    title: 'Exam mode',
    description: 'Real exam conditions: countdown timer, free navigation, flag questions, results only at the end.',
  },
  {
    mode: 'practice',
    icon: '📚',
    title: 'Practice mode',
    description: 'One question at a time, no timer. Check each answer and study the explanation for every option.',
  },
];

export function StartScreen({ exam, resume, onResume, onDiscard, onStart }: Props) {
  const [extendedTime, setExtendedTime] = useState(false);
  const [attempts, setAttempts] = useState<Attempt[]>([]);

  useEffect(() => {
    setExtendedTime(loadSettings().extendedTime);
    setAttempts(attemptsForExam(exam.id));
  }, [exam.id]);

  const toggleExtended = (value: boolean) => {
    setExtendedTime(value);
    saveSettings({ extendedTime: value });
  };

  const minutes = Math.round(examDuration(exam.durationSec, extendedTime) / 60);
  const passPercent = Math.round((exam.passingScore / exam.totalPoints) * 100);
  const best = attempts.length ? Math.max(...attempts.map((a) => a.score)) : null;

  return (
    <div className="mx-auto max-w-3xl">
      {resume && (
        <Card className="mb-4 flex flex-wrap items-center gap-3 border-indigo-200 bg-indigo-50 p-4">
          <div className="mr-auto">
            <p className="text-sm font-semibold text-indigo-900">
              You have an unfinished {resume.mode === 'exam' ? 'timed exam' : 'practice session'}
            </p>
            <p className="text-xs text-indigo-700">
              {Object.keys(resume.answers).length} of {exam.questions.length} questions answered
            </p>
          </div>
          <Button variant="secondary" onClick={onDiscard}>
            Discard
          </Button>
          <Button onClick={onResume}>Resume</Button>
        </Card>
      )}

      <Card className="p-6 sm:p-10">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="mr-auto text-2xl font-bold text-slate-900">{exam.label}</h1>
          {!exam.official && <Badge tone="amber">Unofficial set</Badge>}
        </div>
        <p className="mt-1 text-sm text-slate-500">{exam.source}</p>

        <dl className="mt-6 grid grid-cols-3 gap-4 rounded-lg bg-slate-50 p-4 text-center">
          <div>
            <dt className="text-xs font-medium text-slate-500">Questions</dt>
            <dd className="text-xl font-bold text-slate-900">{exam.questions.length}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-slate-500">Time limit</dt>
            <dd className="text-xl font-bold text-slate-900">{minutes} min</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-slate-500">Pass mark</dt>
            <dd className="text-xl font-bold text-slate-900">
              {exam.passingScore}/{exam.totalPoints}
              <span className="ml-1 text-sm font-medium text-slate-500">({passPercent}%)</span>
            </dd>
          </div>
        </dl>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {MODE_CARDS.map(({ mode, icon, title, description }) => (
            <button
              key={mode}
              type="button"
              onClick={() => onStart(mode, extendedTime)}
              className="group rounded-xl border border-slate-200 p-5 text-left transition-all hover:border-indigo-400 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
            >
              <div className="text-2xl">{icon}</div>
              <h3 className="mt-2 font-semibold text-slate-900 group-hover:text-indigo-700">{title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-slate-500">{description}</p>
              <span className="mt-3 inline-block text-sm font-medium text-indigo-600">
                Start {mode === 'exam' ? 'timed exam' : 'practicing'} →
              </span>
            </button>
          ))}
        </div>

        <label className="mt-5 flex cursor-pointer items-center gap-2.5 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={extendedTime}
            onChange={(e) => toggleExtended(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 accent-indigo-600"
          />
          Extended time (+25%, for non-native English speakers) — applies to exam mode
        </label>

        {attempts.length > 0 && (
          <p className="mt-5 border-t border-slate-100 pt-4 text-sm text-slate-500">
            Previous attempts: <strong className="text-slate-700">{attempts.length}</strong> · Best score:{' '}
            <strong className="text-slate-700">
              {best}/{exam.totalPoints}
            </strong>{' '}
            · <a href="/history/" className="text-indigo-600 hover:underline">View history</a>
          </p>
        )}
      </Card>
    </div>
  );
}
