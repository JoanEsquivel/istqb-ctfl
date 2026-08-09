import { useMemo, useState } from 'react';
import type { ExamSet, QuizMode, SubmitReason } from '../../lib/types';
import { chapterLabel } from '../../lib/chapters';
import { gradeAttempt } from '../../lib/grading';
import { url } from '../../lib/url';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { ProgressRing } from '../ui/ProgressRing';
import { QuestionNavigator, type NavigatorCell } from '../quiz/QuestionNavigator';
import { BreakdownBars } from './BreakdownBars';
import { ReviewQuestion } from './ReviewQuestion';

type Filter = 'all' | 'incorrect' | 'flagged';

interface Props {
  exam: ExamSet;
  answers: Record<string, string[]>;
  flagged: string[];
  mode: QuizMode;
  submitReason: SubmitReason | null;
  onRetake?: () => void;
}

export function ResultsScreen({ exam, answers, flagged, mode, submitReason, onRetake }: Props) {
  const grade = useMemo(() => gradeAttempt(exam, answers), [exam, answers]);
  const [filter, setFilter] = useState<Filter>('all');

  const percent = Math.round((grade.score / grade.maxScore) * 100);
  const resultById = new Map(grade.perQuestion.map((r) => [r.id, r]));

  const cells: NavigatorCell[] = exam.questions.map((q) => ({
    number: q.number,
    state: resultById.get(q.id)!.correct ? 'correct' : 'incorrect',
    flagged: flagged.includes(q.id),
  }));

  const filters: Array<{ id: Filter; label: string; count: number }> = [
    { id: 'all', label: 'All', count: exam.questions.length },
    { id: 'incorrect', label: 'Incorrect', count: grade.perQuestion.filter((r) => !r.correct).length },
    ...(mode === 'exam' ? [{ id: 'flagged' as Filter, label: 'Flagged', count: flagged.length }] : []),
  ];

  const visibleQuestions = exam.questions.filter((q) => {
    if (filter === 'incorrect') return !resultById.get(q.id)!.correct;
    if (filter === 'flagged') return flagged.includes(q.id);
    return true;
  });

  const chapterRows = Object.entries(grade.byChapter)
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([chapter, tally]) => ({ label: chapterLabel(Number(chapter)), ...tally }));

  const kLevelRows = Object.entries(grade.byKLevel)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([kLevel, tally]) => ({ label: kLevel, ...tally }));

  return (
    <div className="mx-auto max-w-4xl">
      <Card
        className={`border-t-4 p-6 sm:p-8 ${grade.passed ? 'border-t-green-600' : 'border-t-red-600'}`}
      >
        <div className="flex flex-col items-center gap-6 sm:flex-row sm:gap-10">
          <ProgressRing
            percent={percent}
            tone={grade.passed ? 'green' : 'red'}
            label={`${grade.score}/${grade.maxScore}`}
            sublabel={`${percent}%`}
          />
          <div className="flex-1 text-center sm:text-left">
            <p className={`text-3xl font-bold ${grade.passed ? 'text-green-700' : 'text-red-700'}`}>
              {grade.passed ? '✓ Passed' : '✗ Not passed'}
            </p>
            <p className="mt-1 text-sm text-slate-500">
              {exam.label} · {mode === 'exam' ? 'Exam mode' : 'Practice mode'} · pass mark{' '}
              {exam.passingScore}/{exam.totalPoints}
              {!exam.official && ' (unofficial threshold)'}
            </p>
            {submitReason === 'timeout' && (
              <p className="mt-2 inline-block rounded-md bg-amber-50 px-2.5 py-1 text-sm font-medium text-amber-800">
                ⏱ Time expired — the exam was submitted automatically.
              </p>
            )}
            {onRetake && (
              <div className="mt-4 flex flex-wrap justify-center gap-3 sm:justify-start">
                <Button variant="secondary" onClick={onRetake}>
                  Back to exam start
                </Button>
                <a
                  href={url('/')}
                  className="inline-flex items-center rounded-lg px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100"
                >
                  All exams
                </a>
              </div>
            )}
          </div>
        </div>

        <div className="mt-8 grid gap-8 border-t border-slate-100 pt-6 sm:grid-cols-2">
          <BreakdownBars title="By chapter" rows={chapterRows} />
          <BreakdownBars title="By K-level" rows={kLevelRows} />
        </div>
      </Card>

      <Card className="mt-6 p-6 sm:p-8">
        <h2 className="text-base font-semibold text-slate-900">Question map</h2>
        <p className="mb-4 text-sm text-slate-500">Green = correct, red = incorrect. Click a cell to jump to its review.</p>
        <div className="[&_.grid]:lg:grid-cols-10">
          <QuestionNavigator
            title=""
            cells={cells}
            onGoto={(index) => {
              const number = exam.questions[index]!.number;
              document.getElementById(`review-q-${number}`)?.scrollIntoView({ behavior: 'smooth' });
            }}
          />
        </div>
      </Card>

      <div className="mt-8">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <h2 className="mr-auto text-base font-semibold text-slate-900">Review</h2>
          {filters.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
                filter === f.id
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50'
              }`}
            >
              {f.label} ({f.count})
            </button>
          ))}
        </div>

        {visibleQuestions.length === 0 ? (
          <Card className="p-8 text-center text-sm text-slate-500">
            {filter === 'incorrect' ? 'No incorrect answers — perfect run! 🎉' : 'No flagged questions.'}
          </Card>
        ) : (
          <div className="flex flex-col gap-6">
            {visibleQuestions.map((question) => (
              <ReviewQuestion
                key={question.id}
                question={question}
                selected={answers[question.id] ?? []}
                correct={resultById.get(question.id)!.correct}
                flagged={flagged.includes(question.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
