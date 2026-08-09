import type { QuizQuestion } from '../../lib/types';
import { Badge } from '../ui/Badge';
import { QuestionCard } from '../quiz/QuestionCard';

interface Props {
  question: QuizQuestion;
  selected: string[];
  correct: boolean;
  flagged: boolean;
}

export function ReviewQuestion({ question, selected, correct, flagged }: Props) {
  return (
    <div id={`review-q-${question.number}`} className="scroll-mt-6">
      <div className="mb-1.5 flex items-center gap-2">
        <Badge tone={correct ? 'green' : 'red'}>{correct ? '✓ Correct' : '✗ Incorrect'}</Badge>
        {selected.length === 0 && <Badge tone="neutral">Not answered</Badge>}
        {flagged && <Badge tone="amber">⚑ Flagged</Badge>}
      </div>
      <QuestionCard
        question={question}
        heading={`Question ${question.number}`}
        selected={selected}
        revealed
        disabled
      />
    </div>
  );
}
