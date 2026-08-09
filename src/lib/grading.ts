import type { ExamSet, QuizQuestion } from './types';
import { chapterOf } from './chapters';

export interface QuestionResult {
  id: string;
  number: number;
  selected: string[];
  correctLetters: string[];
  correct: boolean;
  answered: boolean;
}

export interface Tally {
  correct: number;
  total: number;
}

export interface AttemptGrade {
  score: number;
  maxScore: number;
  passed: boolean;
  perQuestion: QuestionResult[];
  byChapter: Record<number, Tally>;
  byKLevel: Record<string, Tally>;
}

export function isAnswerCorrect(question: QuizQuestion, selected: string[]): boolean {
  if (selected.length !== question.correctLetters.length) return false;
  const sorted = [...selected].sort();
  return sorted.every((letter, i) => letter === question.correctLetters[i]);
}

// All-or-nothing per ISTQB rules; unanswered counts as incorrect.
export function gradeAttempt(exam: ExamSet, answers: Record<string, string[]>): AttemptGrade {
  const perQuestion: QuestionResult[] = [];
  const byChapter: Record<number, Tally> = {};
  const byKLevel: Record<string, Tally> = {};
  let score = 0;

  for (const question of exam.questions) {
    const selected = answers[question.id] ?? [];
    const correct = isAnswerCorrect(question, selected);
    if (correct) score += question.points;

    perQuestion.push({
      id: question.id,
      number: question.number,
      selected,
      correctLetters: question.correctLetters,
      correct,
      answered: selected.length > 0,
    });

    const chapter = chapterOf(question.learningObjective);
    byChapter[chapter] ??= { correct: 0, total: 0 };
    byChapter[chapter].total += 1;
    if (correct) byChapter[chapter].correct += 1;

    byKLevel[question.kLevel] ??= { correct: 0, total: 0 };
    byKLevel[question.kLevel].total += 1;
    if (correct) byKLevel[question.kLevel].correct += 1;
  }

  return {
    score,
    maxScore: exam.totalPoints,
    passed: score >= exam.passingScore,
    perQuestion,
    byChapter,
    byKLevel,
  };
}
