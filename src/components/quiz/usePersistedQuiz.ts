import { useEffect, useReducer, useRef } from 'react';
import type { Dispatch } from 'react';
import type { Attempt, ExamSet, QuizState } from '../../lib/types';
import { gradeAttempt } from '../../lib/grading';
import { clearInProgress, saveAttempt, saveInProgress } from '../../lib/storage';
import { examDuration } from '../../lib/config';
import { makeInitialState, quizReducer, type QuizAction } from './reducer';

// useReducer wrapper that mirrors in-progress state to localStorage and,
// on submit, converts the final state into a saved Attempt record.
export function usePersistedQuiz(exam: ExamSet): [QuizState, Dispatch<QuizAction>] {
  const [state, dispatch] = useReducer(quizReducer, exam.id, makeInitialState);
  const savedAttemptRef = useRef<string | null>(null);

  useEffect(() => {
    if (state.phase === 'in-progress') {
      saveInProgress(state);
      return;
    }

    if (state.phase === 'review' && state.submitReason && savedAttemptRef.current !== state.attemptId) {
      savedAttemptRef.current = state.attemptId;
      const grade = gradeAttempt(exam, state.answers);
      const attempt: Attempt = {
        id: state.attemptId,
        examId: state.examId,
        mode: state.mode,
        startedAt: state.startedAt,
        submittedAt: state.submittedAt ?? Date.now(),
        durationSec: state.mode === 'exam' ? examDuration(exam.durationSec, state.extendedTime) : null,
        extendedTime: state.extendedTime,
        submitReason: state.submitReason,
        answers: state.answers,
        flagged: state.flagged,
        score: grade.score,
        maxScore: grade.maxScore,
        passed: grade.passed,
      };
      saveAttempt(attempt);
      clearInProgress(state.examId);
    }
  }, [state, exam]);

  return [state, dispatch];
}
