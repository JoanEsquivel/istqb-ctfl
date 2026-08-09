export interface ExamOption {
  letter: string;
  text: string;
  isCorrect: boolean;
  explanation: string;
}

export interface ExamQuestion {
  id: string;
  number: number;
  section: 'main' | 'additional';
  points: number;
  learningObjective: string;
  kLevel: 'K1' | 'K2' | 'K3';
  selectCount: number;
  question: string;
  options: ExamOption[];
  rationale?: string;
  hasFigure?: boolean;
  image?: string;
}

export interface ExamFile {
  exam: string;
  source: string;
  totalQuestions: number;
  totalPoints: number;
  passingScore: number;
  questions: ExamQuestion[];
}

export interface QuizQuestion extends ExamQuestion {
  correctLetters: string[];
}

export interface ExamSet {
  id: string;
  label: string;
  description: string;
  source: string;
  official: boolean;
  questions: QuizQuestion[];
  totalPoints: number;
  passingScore: number;
  durationSec: number;
}

export type QuizMode = 'exam' | 'practice';

export type SubmitReason = 'manual' | 'timeout' | 'practice-complete';

export interface Attempt {
  id: string;
  examId: string;
  mode: QuizMode;
  startedAt: number;
  submittedAt: number;
  durationSec: number | null;
  extendedTime: boolean;
  submitReason: SubmitReason;
  answers: Record<string, string[]>;
  flagged: string[];
  score: number;
  maxScore: number;
  passed: boolean;
}

export interface Settings {
  extendedTime: boolean;
}

export type QuizPhase = 'start' | 'in-progress' | 'review';

export interface QuizState {
  attemptId: string;
  examId: string;
  mode: QuizMode;
  phase: QuizPhase;
  startedAt: number;
  endsAt: number | null;
  extendedTime: boolean;
  currentIndex: number;
  answers: Record<string, string[]>;
  flagged: string[];
  checked: string[];
  submittedAt: number | null;
  submitReason: SubmitReason | null;
}
