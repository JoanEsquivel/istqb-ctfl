import type { Dispatch } from 'react';
import type { ExamSet, QuizState } from '../../lib/types';
import { isAnswerCorrect } from '../../lib/grading';
import { Button } from '../ui/Button';
import type { QuizAction } from './reducer';
import { QuestionCard } from './QuestionCard';
import { QuestionNavigator, type NavigatorCell } from './QuestionNavigator';
import { TimerPill } from './TimerPill';

interface Props {
  exam: ExamSet;
  state: QuizState;
  dispatch: Dispatch<QuizAction>;
  remainingSec: number | null;
  onRequestSubmit: () => void;
}

export function QuizScreen({ exam, state, dispatch, remainingSec, onRequestSubmit }: Props) {
  const question = exam.questions[state.currentIndex]!;
  const selected = state.answers[question.id] ?? [];
  const total = exam.questions.length;
  const answeredCount = exam.questions.filter((q) => (state.answers[q.id] ?? []).length > 0).length;

  if (state.mode === 'practice') {
    const checked = state.checked.includes(question.id);
    const correctCount = state.checked.filter((id) => {
      const q = exam.questions.find((eq) => eq.id === id);
      return q ? isAnswerCorrect(q, state.answers[id] ?? []) : false;
    }).length;
    const isLast = state.currentIndex === total - 1;
    const canCheck = selected.length === question.selectCount;

    return (
      <div className="mx-auto max-w-2xl">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 text-sm">
          <span className="font-medium text-slate-600">
            {exam.label} · Practice · Question {state.currentIndex + 1} of {total}
          </span>
          <span className="rounded-full bg-green-50 px-3 py-1 font-semibold text-green-700">
            ✓ {correctCount} / {state.checked.length} correct
          </span>
        </div>
        <div className="mb-4 h-1.5 overflow-hidden rounded-full bg-slate-200">
          <div
            className="h-full rounded-full bg-indigo-600 transition-all duration-300"
            style={{ width: `${(state.checked.length / total) * 100}%` }}
          />
        </div>
        <QuestionCard
          question={question}
          heading={`Question ${state.currentIndex + 1}`}
          selected={selected}
          revealed={checked}
          disabled={checked}
          onSelect={(letter) =>
            dispatch({ type: 'SELECT_OPTION', questionId: question.id, letter, selectCount: question.selectCount })
          }
          footer={
            checked ? (
              <Button
                className="ml-auto"
                onClick={() =>
                  isLast
                    ? dispatch({ type: 'SUBMIT', reason: 'practice-complete', now: Date.now() })
                    : dispatch({ type: 'NEXT', total })
                }
              >
                {isLast ? 'See results' : 'Next question →'}
              </Button>
            ) : (
              <Button
                className="ml-auto"
                disabled={!canCheck}
                onClick={() => dispatch({ type: 'CHECK_ANSWER', questionId: question.id })}
              >
                Check answer
              </Button>
            )
          }
        />
      </div>
    );
  }

  const cells: NavigatorCell[] = exam.questions.map((q, index) => ({
    number: q.number,
    state:
      index === state.currentIndex
        ? 'current'
        : (state.answers[q.id] ?? []).length > 0
          ? 'answered'
          : 'unanswered',
    flagged: state.flagged.includes(q.id),
  }));

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <h1 className="mr-auto text-lg font-bold text-slate-900">{exam.label}</h1>
        <span className="text-sm text-slate-500">
          {answeredCount}/{total} answered
        </span>
        {remainingSec !== null && <TimerPill remainingSec={remainingSec} />}
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_240px]">
        <QuestionCard
          question={question}
          heading={`Question ${question.number}`}
          selected={selected}
          revealed={false}
          disabled={false}
          onSelect={(letter) =>
            dispatch({ type: 'SELECT_OPTION', questionId: question.id, letter, selectCount: question.selectCount })
          }
          flagged={state.flagged.includes(question.id)}
          onToggleFlag={() => dispatch({ type: 'TOGGLE_FLAG', questionId: question.id })}
          footer={
            <>
              <Button
                variant="secondary"
                disabled={state.currentIndex === 0}
                onClick={() => dispatch({ type: 'PREV' })}
              >
                ← Previous
              </Button>
              <Button
                variant="secondary"
                disabled={state.currentIndex === total - 1}
                onClick={() => dispatch({ type: 'NEXT', total })}
              >
                Next →
              </Button>
            </>
          }
        />

        <aside className="lg:sticky lg:top-6 lg:self-start">
          <QuestionNavigator cells={cells} onGoto={(index) => dispatch({ type: 'GOTO', index })} />
          <Button className="mt-4 w-full" onClick={onRequestSubmit}>
            Submit exam
          </Button>
          <p className="mt-3 text-xs leading-relaxed text-slate-400">
            <span className="mr-1 inline-block h-2 w-2 rounded-full bg-amber-500" />
            flagged for review · The timer cannot be paused.
          </p>
        </aside>
      </div>
    </div>
  );
}
