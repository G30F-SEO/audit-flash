"use client";

import { useEffect, useState } from "react";

interface ScoreGaugeProps {
  score: number;
  label: string;
  size?: "sm" | "md" | "lg";
}

function getColor(score: number): string {
  if (score >= 80) return "#28A745";
  if (score >= 50) return "#F39C12";
  return "#DC3545";
}

function getVerdict(score: number): string {
  if (score >= 80) return "Bon";
  if (score >= 60) return "Correct";
  if (score >= 40) return "Moyen";
  return "Faible";
}

const sizeMap = {
  sm: { width: 80, stroke: 6, fontSize: 16, labelSize: 10 },
  md: { width: 120, stroke: 8, fontSize: 24, labelSize: 12 },
  lg: { width: 180, stroke: 12, fontSize: 40, labelSize: 14 },
};

export default function ScoreGauge({ score, label, size = "md" }: ScoreGaugeProps) {
  const [animatedScore, setAnimatedScore] = useState(0);
  const dims = sizeMap[size];
  const radius = (dims.width - dims.stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (animatedScore / 100) * circumference;
  const color = getColor(score);

  useEffect(() => {
    const timer = setTimeout(() => setAnimatedScore(score), 100);
    return () => clearTimeout(timer);
  }, [score]);

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={dims.width} height={dims.width} className="transform -rotate-90">
        <circle
          cx={dims.width / 2}
          cy={dims.width / 2}
          r={radius}
          fill="none"
          stroke="#E5E7EB"
          strokeWidth={dims.stroke}
        />
        <circle
          cx={dims.width / 2}
          cy={dims.width / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={dims.stroke}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div
        className="absolute flex flex-col items-center justify-center"
        style={{ width: dims.width, height: dims.width }}
      >
        <span style={{ fontSize: dims.fontSize, color }} className="font-bold leading-none">
          {Math.round(animatedScore)}
        </span>
        {size === "lg" && (
          <span className="text-xs text-slate-500 mt-1">{getVerdict(score)}</span>
        )}
      </div>
      <span
        className="text-center font-medium text-slate-600 leading-tight"
        style={{ fontSize: dims.labelSize, maxWidth: dims.width }}
      >
        {label}
      </span>
    </div>
  );
}
