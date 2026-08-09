interface Row {
  label: string;
  correct: number;
  total: number;
}

export function BreakdownBars({ title, rows }: { title: string; rows: Row[] }) {
  return (
    <div>
      <h3 className="mb-3 text-xs font-semibold tracking-wide text-slate-500 uppercase">{title}</h3>
      <div className="flex flex-col gap-2.5">
        {rows.map((row) => {
          const percent = row.total ? (row.correct / row.total) * 100 : 0;
          return (
            <div key={row.label}>
              <div className="mb-1 flex items-baseline justify-between gap-2 text-sm">
                <span className="truncate text-slate-700">{row.label}</span>
                <span className="shrink-0 font-medium text-slate-500 tabular-nums">
                  {row.correct}/{row.total}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                <div
                  className={`h-full rounded-full ${percent >= 65 ? 'bg-green-500' : 'bg-red-400'}`}
                  style={{ width: `${percent}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
