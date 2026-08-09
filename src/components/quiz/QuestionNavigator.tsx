export type CellState =
  | 'current'
  | 'answered'
  | 'unanswered'
  | 'correct'
  | 'incorrect';

export interface NavigatorCell {
  number: number;
  state: CellState;
  flagged: boolean;
}

const CELL_STYLES: Record<CellState, string> = {
  current: 'border-indigo-600 bg-indigo-600 text-white ring-2 ring-indigo-300',
  answered: 'border-indigo-200 bg-indigo-100 text-indigo-700 hover:border-indigo-400',
  unanswered: 'border-slate-200 bg-white text-slate-500 hover:border-slate-400',
  correct: 'border-green-600 bg-green-600 text-white hover:bg-green-700',
  incorrect: 'border-red-600 bg-red-600 text-white hover:bg-red-700',
};

interface Props {
  cells: NavigatorCell[];
  onGoto: (index: number) => void;
  title?: string;
}

export function QuestionNavigator({ cells, onGoto, title = 'Questions' }: Props) {
  return (
    <div>
      <h3 className="mb-2 text-xs font-semibold tracking-wide text-slate-500 uppercase">{title}</h3>
      <div className="grid grid-cols-8 gap-1.5 lg:grid-cols-5">
        {cells.map((cell, index) => (
          <button
            key={cell.number}
            type="button"
            onClick={() => onGoto(index)}
            aria-label={`Question ${cell.number}`}
            className={`relative flex h-9 w-full items-center justify-center rounded-md border text-sm font-medium transition-colors ${CELL_STYLES[cell.state]}`}
          >
            {cell.number}
            {cell.flagged && (
              <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full border border-white bg-amber-500" />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
