interface Props {
  percent: number; // 0..100
  size?: number;
  stroke?: number;
  tone: 'green' | 'red';
  label: string;
  sublabel?: string;
}

export function ProgressRing({ percent, size = 128, stroke = 10, tone, label, sublabel }: Props) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - Math.min(100, Math.max(0, percent)) / 100);
  const color = tone === 'green' ? 'stroke-green-600' : 'stroke-red-600';

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} strokeWidth={stroke} className="fill-none stroke-slate-200" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={`fill-none ${color} transition-[stroke-dashoffset] duration-700`}
        />
      </svg>
      <div className="absolute text-center">
        <div className="text-2xl font-bold text-slate-900">{label}</div>
        {sublabel && <div className="text-xs text-slate-500">{sublabel}</div>}
      </div>
    </div>
  );
}
