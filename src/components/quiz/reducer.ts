import type { QuizMode, QuizState, SubmitReason } from '../../lib/types';
import { examDuration } from '../../lib/config';

export type QuizAction =
  | { type: 'START'; mode: QuizMode; extendedTime: boolean; baseDurationSec: number; now: number }
  | { type: 'RESUME'; state: QuizState }
  | { type: 'SELECT_OPTION'; questionId: string; letter: string; selectCount: number }
  | { type: 'TOGGLE_FLAG'; questionId: string }
  | { type: 'GOTO'; index: number }
  | { type: 'NEXT'; total: number }
  | { type: 'PREV' }
  | { type: 'CHECK_ANSWER'; questionId: string }
  | { type: 'SUBMIT'; reason: SubmitReason; now: number }
  | { type: 'RESET' };

export function makeInitialState(examId: string): QuizState {
  return {
    attemptId: '',
    examId,
    mode: 'exam',
    phase: 'start',
    startedAt: 0,
    endsAt: null,
    extendedTime: false,
    currentIndex: 0,
    answers: {},
    flagged: [],
    checked: [],
    submittedAt: null,
    submitReason: null,
  };
}

export function quizReducer(state: QuizState, action: QuizAction): QuizState {
  switch (action.type) {
    case 'START': {
      return {
        ...makeInitialState(state.examId),
        attemptId: crypto.randomUUID(),
        mode: action.mode,
        phase: 'in-progress',
        startedAt: action.now,
        extendedTime: action.extendedTime,
        endsAt:
          action.mode === 'exam'
            ? action.now + examDuration(action.baseDurationSec, action.extendedTime) * 1000
            : null,
      };
    }

    case 'RESUME':
      return action.state;

    case 'SELECT_OPTION': {
      if (state.phase !== 'in-progress') return state;
      // Practice mode locks a question once its answer has been revealed.
      if (state.mode === 'practice' && state.checked.includes(action.questionId)) return state;

      const current = state.answers[action.questionId] ?? [];
      let next: string[];
      if (action.selectCount === 1) {
        next = [action.letter];
      } else if (current.includes(action.letter)) {
        next = current.filter((l) => l !== action.letter);
      } else if (current.length < action.selectCount) {
        next = [...current, action.letter];
      } else {
        return state; // already at the selection cap — deselect first
      }
      return { ...state, answers: { ...state.answers, [action.questionId]: next } };
    }

    case 'TOGGLE_FLAG': {
      if (state.phase !== 'in-progress') return state;
      const flagged = state.flagged.includes(action.questionId)
        ? state.flagged.filter((id) => id !== action.questionId)
        : [...state.flagged, action.questionId];
      return { ...state, flagged };
    }

    case 'GOTO':
      return state.phase === 'in-progress' ? { ...state, currentIndex: action.index } : state;

    case 'NEXT':
      return state.phase === 'in-progress'
        ? { ...state, currentIndex: Math.min(state.currentIndex + 1, action.total - 1) }
        : state;

    case 'PREV':
      return state.phase === 'in-progress'
        ? { ...state, currentIndex: Math.max(state.currentIndex - 1, 0) }
        : state;

    case 'CHECK_ANSWER': {
      if (state.phase !== 'in-progress' || state.checked.includes(action.questionId)) return state;
      return { ...state, checked: [...state.checked, action.questionId] };
    }

    case 'SUBMIT': {
      if (state.phase !== 'in-progress') return state;
      return { ...state, phase: 'review', submittedAt: action.now, submitReason: action.reason };
    }

    case 'RESET':
      return makeInitialState(state.examId);

    default:
      return state;
  }
}
