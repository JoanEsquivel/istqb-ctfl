import type { ExamOption } from '../../lib/types';

export type OptionVisual = 'default' | 'selected' | 'correct' | 'incorrect' | 'missed';

export function optionVisual(option: ExamOption, selected: string[], revealed: boolean): OptionVisual {
  const isSelected = selected.includes(option.letter);
  if (!revealed) return isSelected ? 'selected' : 'default';
  if (option.isCorrect) return isSelected ? 'correct' : 'missed';
  return isSelected ? 'incorrect' : 'default';
}

const ROW_STYLES: Record<OptionVisual, string> = {
  default: 'border-slate-200 bg-white hover:border-indigo-300 hover:bg-slate-50',
  selected: 'border-indigo-600 bg-indigo-50 ring-1 ring-indigo-600',
  correct: 'border-green-600 bg-green-50',
  incorrect: 'border-red-600 bg-red-50',
  missed: 'border-dashed border-green-600 bg-white',
};

const CHIP_STYLES: Record<OptionVisual, string> = {
  default: 'border-slate-300 text-slate-600',
  selected: 'border-indigo-600 bg-indigo-600 text-white',
  correct: 'border-green-600 bg-green-600 text-white',
  incorrect: 'border-red-600 bg-red-600 text-white',
  missed: 'border-green-600 text-green-700',
};

interface Props {
  option: ExamOption;
  visual: OptionVisual;
  wasSelected: boolean;
  showExplanation: boolean;
  disabled: boolean;
  onSelect?: () => void;
}

export function OptionRow({ option, visual, wasSelected, showExplanation, disabled, onSelect }: Props) {
  const revealed = showExplanation;
  return (
    <div className={`rounded-lg border transition-colors ${ROW_STYLES[visual]}`}>
      <button
        type="button"
        disabled={disabled}
        onClick={onSelect}
        className="flex w-full items-start gap-3 px-4 py-3 text-left disabled:cursor-default"
      >
        <span
          className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-sm font-semibold uppercase ${CHIP_STYLES[visual]}`}
        >
          {option.letter}
        </span>
        <span className="flex-1 text-sm leading-relaxed whitespace-pre-line text-slate-800">{option.text}</span>
        {revealed && (
          <span className="mt-0.5 shrink-0 text-xs font-semibold">
            {visual === 'correct' && <span className="text-green-700">✓ Correct</span>}
            {visual === 'missed' && <span className="text-green-700">Correct answer</span>}
            {visual === 'incorrect' && <span className="text-red-700">✗ Your answer</span>}
            {visual === 'default' && wasSelected && <span className="text-slate-500">Your answer</span>}
          </span>
        )}
      </button>
      {revealed && (
        <p
          className={`border-t px-4 py-2.5 text-sm leading-relaxed ${
            option.isCorrect ? 'border-green-200 text-green-900' : 'border-slate-200 text-slate-600'
          }`}
        >
          {option.explanation}
        </p>
      )}
    </div>
  );
}
