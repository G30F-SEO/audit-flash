import { useState, useEffect } from 'react';

function getColor(score) {
  if (score >= 80) return '#28A745';
  if (score >= 50) return '#F5A623';
  return '#DC3545';
}

const sizes = {
  sm: { w: 70, stroke: 5, font: 14, label: 9 },
  md: { w: 100, stroke: 7, font: 20, label: 10 },
  lg: { w: 150, stroke: 10, font: 34, label: 12 },
};

export default function ScoreGauge({ score, label, size = 'md' }) {
  const [val, setVal] = useState(0);
  const d = sizes[size];
  const r = (d.w - d.stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (val / 100) * c;
  const color = getColor(score);

  useEffect(() => {
    const t = setTimeout(() => setVal(score), 150);
    return () => clearTimeout(t);
  }, [score]);

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={d.w} height={d.w} className="transform -rotate-90">
        <circle cx={d.w / 2} cy={d.w / 2} r={r} fill="none" stroke="var(--border, #374151)" strokeWidth={d.stroke} />
        <circle cx={d.w / 2} cy={d.w / 2} r={r} fill="none" stroke={color} strokeWidth={d.stroke}
          strokeDasharray={c} strokeDashoffset={offset} strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 1s ease-out' }} />
      </svg>
      <div className="absolute flex flex-col items-center justify-center" style={{ width: d.w, height: d.w }}>
        <span style={{ fontSize: d.font, color }} className="font-bold leading-none">{Math.round(val)}</span>
      </div>
      <span className="text-center font-medium text-text-secondary leading-tight" style={{ fontSize: d.label, maxWidth: d.w }}>
        {label}
      </span>
    </div>
  );
}
