import type { ReactNode } from 'react';
import type { QuizQuestion } from '../../lib/types';
import { resolveImage } from '../../lib/images';
import { Badge } from '../ui/Badge';
import { Card } from '../ui/Card';
import { OptionRow, optionVisual } from './OptionRow';

interface Props {
  question: QuizQuestion;
  heading: string; // e.g. "Question 12" or "Question 12 of 40"
  selected: string[];
  revealed: boolean;
  disabled: boolean;
  onSelect?: (letter: string) => void;
  flagged?: boolean;
  onToggleFlag?: () => void;
  footer?: ReactNode;
}

export function QuestionCard({
  question,
  heading,
  selected,
  revealed,
  disabled,
  onSelect,
  flagged,
  onToggleFlag,
  footer,
}: Props) {
  const imageUrl = question.image ? resolveImage(question.image) : undefined;

  return (
    <Card className="p-6 sm:p-8">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="mr-auto text-base font-semibold text-slate-900">{heading}</h2>
        <Badge tone="indigo">{question.kLevel}</Badge>
        <Badge tone="neutral">{question.learningObjective}</Badge>
        {question.selectCount > 1 && (
          <Badge tone={!revealed && selected.length === question.selectCount ? 'green' : 'amber'}>
            Select {question.selectCount} ({selected.length}/{question.selectCount})
          </Badge>
        )}
        {onToggleFlag && (
          <button
            type="button"
            onClick={onToggleFlag}
            aria-pressed={flagged}
            className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition-colors ${
              flagged ? 'bg-amber-100 text-amber-800' : 'text-slate-500 hover:bg-slate-100'
            }`}
          >
            ⚑ {flagged ? 'Flagged' : 'Flag'}
          </button>
        )}
      </div>

      <p className="mt-4 max-w-2xl text-[15px] leading-relaxed whitespace-pre-line text-slate-800">
        {question.question}
      </p>

      {imageUrl && (
        <div className="mt-4 overflow-hidden rounded-lg border border-slate-200 bg-white p-2">
          <img src={imageUrl} alt={`Figure for question ${question.number}`} className="max-w-full" />
        </div>
      )}

      <div className="mt-5 flex flex-col gap-2.5">
        {question.options.map((option) => (
          <OptionRow
            key={option.letter}
            option={option}
            visual={optionVisual(option, selected, revealed)}
            wasSelected={selected.includes(option.letter)}
            showExplanation={revealed}
            disabled={disabled}
            onSelect={onSelect ? () => onSelect(option.letter) : undefined}
          />
        ))}
      </div>

      {revealed && question.rationale && (
        <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
          <h4 className="text-xs font-semibold tracking-wide text-slate-500 uppercase">Rationale</h4>
          <p className="mt-1 text-sm leading-relaxed whitespace-pre-line text-slate-700">{question.rationale}</p>
        </div>
      )}

      {footer && <div className="mt-6 flex items-center justify-between gap-3">{footer}</div>}
    </Card>
  );
}
