import { useEffect, useState } from 'react';
import type { ExamSet, QuizMode, QuizState } from '../../lib/types';
import { clearInProgress, loadInProgress } from '../../lib/storage';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { ResultsScreen } from '../results/ResultsScreen';
import { usePersistedQuiz } from './usePersistedQuiz';
import { useTimer } from './useTimer';
import { QuizScreen } from './QuizScreen';
import { StartScreen } from './StartScreen';

export default function ExamApp({ exam }: { exam: ExamSet }) {
  const [state, dispatch] = usePersistedQuiz(exam);
  const [resume, setResume] = useState<QuizState | null>(null);
  const [confirmUnanswered, setConfirmUnanswered] = useState(0);
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    const saved = loadInProgress(exam.id);
    if (saved && saved.phase === 'in-progress') setResume(saved);
  }, [exam.id]);

  const timerEndsAt = state.phase === 'in-progress' && state.mode === 'exam' ? state.endsAt : null;
  const remainingSec = useTimer(timerEndsAt, () =>
    dispatch({ type: 'SUBMIT', reason: 'timeout', now: Date.now() }),
  );

  // Warn before losing an in-progress timed exam (state is persisted, but the clock keeps running).
  useEffect(() => {
    if (!(state.phase === 'in-progress' && state.mode === 'exam')) return;
    const handler = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [state.phase, state.mode]);

  const handleStart = (mode: QuizMode, extendedTime: boolean) => {
    let baseDurationSec = exam.durationSec;
    if (import.meta.env.DEV) {
      const dur = Number(new URLSearchParams(window.location.search).get('dur'));
      if (dur > 0) baseDurationSec = dur;
    }
    setResume(null);
    dispatch({ type: 'START', mode, extendedTime, baseDurationSec, now: Date.now() });
  };

  const handleRequestSubmit = () => {
    const unanswered = exam.questions.filter((q) => (state.answers[q.id] ?? []).length === 0).length;
    if (unanswered > 0) {
      setConfirmUnanswered(unanswered);
      setConfirmOpen(true);
    } else {
      dispatch({ type: 'SUBMIT', reason: 'manual', now: Date.now() });
    }
  };

  if (state.phase === 'start') {
    return (
      <StartScreen
        exam={exam}
        resume={resume}
        onResume={() => {
          if (resume) dispatch({ type: 'RESUME', state: resume });
          setResume(null);
        }}
        onDiscard={() => {
          clearInProgress(exam.id);
          setResume(null);
        }}
        onStart={handleStart}
      />
    );
  }

  if (state.phase === 'review') {
    return (
      <ResultsScreen
        exam={exam}
        answers={state.answers}
        flagged={state.flagged}
        mode={state.mode}
        submitReason={state.submitReason}
        onRetake={() => dispatch({ type: 'RESET' })}
      />
    );
  }

  return (
    <>
      <QuizScreen
        exam={exam}
        state={state}
        dispatch={dispatch}
        remainingSec={remainingSec}
        onRequestSubmit={handleRequestSubmit}
      />
      <ConfirmDialog
        open={confirmOpen}
        title="Submit exam?"
        confirmLabel="Submit anyway"
        cancelLabel="Keep answering"
        onConfirm={() => {
          setConfirmOpen(false);
          dispatch({ type: 'SUBMIT', reason: 'manual', now: Date.now() });
        }}
        onCancel={() => setConfirmOpen(false)}
      >
        {confirmUnanswered} question{confirmUnanswered === 1 ? '' : 's'} still unanswered. Unanswered
        questions count as incorrect.
      </ConfirmDialog>
    </>
  );
}
