import type { ExamFile, ExamQuestion, ExamSet, QuizQuestion } from './types';
import { PASS_RATIO, SECONDS_PER_QUESTION, STANDARD_DURATION_SEC } from './config';
import examAJson from '../../converted_assets/exam-A.json';
import examBJson from '../../converted_assets/exam-B.json';
import examCJson from '../../converted_assets/exam-C.json';
import examDJson from '../../converted_assets/exam-D.json';

const examA = examAJson as unknown as ExamFile;
const examB = examBJson as unknown as ExamFile;
const examC = examCJson as unknown as ExamFile;
const examD = examDJson as unknown as ExamFile;

function enrich(questions: ExamQuestion[]): QuizQuestion[] {
  return questions.map((q) => ({
    ...q,
    correctLetters: q.options.filter((o) => o.isCorrect).map((o) => o.letter).sort(),
  }));
}

function officialSet(file: ExamFile): ExamSet {
  return {
    id: file.exam,
    label: `Sample Exam ${file.exam}`,
    description: `Official ISTQB CTFL v4.0 sample exam · ${file.totalQuestions} questions`,
    source: file.source,
    official: true,
    questions: enrich(file.questions.filter((q) => q.section === 'main')),
    totalPoints: file.totalPoints,
    passingScore: file.passingScore,
    durationSec: STANDARD_DURATION_SEC,
  };
}

function bonusSet(file: ExamFile): ExamSet {
  const questions = enrich(file.questions.filter((q) => q.section === 'additional'));
  const totalPoints = questions.reduce((sum, q) => sum + q.points, 0);
  return {
    id: `${file.exam}-extra`,
    label: 'Bonus Practice Set',
    description: `${questions.length} extra questions from Exam ${file.exam}'s appendix · unofficial`,
    source: file.source,
    official: false,
    questions,
    totalPoints,
    passingScore: Math.ceil(totalPoints * PASS_RATIO),
    durationSec: questions.length * SECONDS_PER_QUESTION,
  };
}

export const EXAM_SETS: ExamSet[] = [
  officialSet(examA),
  officialSet(examB),
  officialSet(examC),
  officialSet(examD),
  bonusSet(examA),
];

export function getExam(id: string): ExamSet | undefined {
  return EXAM_SETS.find((set) => set.id === id);
}
