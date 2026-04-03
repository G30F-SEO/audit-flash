import { cn } from "@/lib/utils";

interface KpiCardProps {
  value: string | number;
  label: string;
  threshold?: { good: number; bad: number; unit?: string };
  numericValue?: number;
  className?: string;
}

function getThresholdColor(value: number, threshold: { good: number; bad: number }): string {
  if (value <= threshold.good) return "text-green-600";
  if (value <= threshold.bad) return "text-orange-500";
  return "text-red-500";
}

export default function KpiCard({ value, label, threshold, numericValue, className }: KpiCardProps) {
  const colorClass =
    threshold && numericValue !== undefined
      ? getThresholdColor(numericValue, threshold)
      : "text-slate-800";

  return (
    <div className={cn("bg-white rounded-xl border border-slate-100 p-4 shadow-sm", className)}>
      <p className={cn("text-2xl font-bold leading-none", colorClass)}>
        {value}
      </p>
      <p className="text-xs text-slate-500 mt-1.5 leading-tight">{label}</p>
      {threshold && (
        <p className="text-[10px] text-slate-400 mt-1">
          Seuil : &lt; {threshold.good}
          {threshold.unit ?? "ms"} = bon
        </p>
      )}
    </div>
  );
}
